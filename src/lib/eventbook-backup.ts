import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { EventBook } from '../types/eventbook';
import { eventBookStorage } from './eventbook-storage';
import { guestStorage } from './guest-storage';

// Función para convertir imagen a base64
const imageToBase64 = async (imageUrl: string): Promise<string> => {
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error converting image to base64:', error);
    return '';
  }
};

// Función para generar backup completo de un EventBook
export const generateEventBookBackup = async (eventBook: EventBook): Promise<Blob> => {
  const zip = new JSZip();
  
  // Obtener todos los posts del EventBook
  let posts = isEventBookClosed(eventBook)
    ? await eventBookStorage.getBackupPosts(eventBook.id)
    : await eventBookStorage.getAllPosts(eventBook.id);
  // Preferir feed de moderación (incluye pendientes/reportados) cuando hay sesión
  try {
    if (!isEventBookClosed(eventBook)) {
      const feed = await eventBookStorage.getModerationFeed(eventBook.id);
      if (feed?.posts) posts = feed.posts;
    }
  } catch {
    // best-effort
  }
  const guests = await guestStorage.getAllGuests(eventBook.id);
  
  // Crear estructura de datos del backup
  const backupData = {
    eventBook: {
      ...eventBook,
      backupGeneratedAt: new Date().toISOString()
    },
    posts: [] as any[],
    guests: guests,
    metadata: {
      version: '1.0',
      generatedAt: new Date().toISOString(),
      totalPosts: posts.length,
      totalGuests: guests.length
    }
  };

  // Procesar cada post y sus imágenes
  const processedPosts: any[] = [];
  const imageFolder = zip.folder('images');
  
  for (const post of posts) {
    const processedPost = { ...post };
    
    // Procesar imágenes del post
    if (post.mediaFiles && post.mediaFiles.length > 0) {
      const processedMediaFiles = [];
      
      for (let i = 0; i < post.mediaFiles.length; i++) {
        const media = post.mediaFiles[i];
        
        if (media.type === 'image') {
          try {
            // Convertir imagen a base64
            const base64Data = await imageToBase64(media.url);
            const fileName = `post_${post.id}_image_${i + 1}.jpg`;
            
            // Agregar imagen al ZIP como archivo separado
            if (base64Data) {
              const base64Content = base64Data.split(',')[1]; // Remover prefijo data:image/...;base64,
              imageFolder?.file(fileName, base64Content, { base64: true });
            }
            
            // Guardar referencia en el post con base64 embebido
            processedMediaFiles.push({
              ...media,
              base64: base64Data,
              fileName: fileName
            });
          } catch (error) {
            console.error(`Error processing image ${i} for post ${post.id}:`, error);
            processedMediaFiles.push(media);
          }
        } else {
          processedMediaFiles.push(media);
        }
      }
      
      processedPost.mediaFiles = processedMediaFiles;
    }
    
    processedPosts.push(processedPost);
  }
  
  backupData.posts = processedPosts;
  
  // Agregar archivo JSON principal con todos los datos
  zip.file('eventbook-data.json', JSON.stringify(backupData, null, 2));
  
  // Generar el archivo ZIP
  return await zip.generateAsync({ type: 'blob' });
};

// Función para descargar backup manualmente
export const downloadEventBookBackup = (eventBook: EventBook): void => {
  if (!eventBook.backupData?.blob) {
    throw new Error('No hay backup disponible para este EventBook');
  }
  
  try {
    // Convertir base64 a blob
    const base64Data = eventBook.backupData.blob.split(',')[1];
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/zip' });
    
    // Descargar archivo
    const fileName = `${eventBook.name.replace(/[^a-zA-Z0-9]/g, '_')}_backup_${new Date().toISOString().split('T')[0]}.zip`;
    saveAs(blob, fileName);
  } catch (error) {
    console.error('Error downloading backup:', error);
    throw new Error('Error al descargar el backup');
  }
};

// Función para verificar y procesar EventBooks expirados
export const checkAndProcessExpiredEventBooks = async (): Promise<EventBook[]> => {
  const eventBooks = await eventBookStorage.getEventBooksByUser();
  const expiredEventBooks: EventBook[] = [];
  const now = new Date();
  
  for (const eventBook of eventBooks) {
    const closeDate = eventBook.settings.visibility?.closeDate;
    
    // Solo procesar si tiene fecha de cierre, no está cerrado, y la fecha ya pasó
    if (closeDate && new Date(closeDate) <= now && eventBook.status !== 'closed') {
      try {
        console.log(`Procesando EventBook expirado: ${eventBook.name}`);
        
        // Generar backup
        const backupBlob = await generateEventBookBackup(eventBook);
        
        // Convertir blob a base64 para almacenar
        const backupBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(backupBlob);
        });
        
        // Actualizar EventBook con estado cerrado y datos del backup
        await eventBookStorage.updateEventBook(eventBook.id, {
          status: 'closed',
          backupData: {
            generated: true,
            generatedAt: new Date().toISOString(),
            size: backupBlob.size,
            blob: backupBase64
          }
        });
        
        // Archivar posts (eliminar datos públicos)
        await eventBookStorage.archiveEventBookPosts(eventBook.id);
        
        expiredEventBooks.push({
          ...eventBook,
          status: 'closed'
        });
        
        console.log(`EventBook ${eventBook.name} cerrado y backup generado exitosamente`);
        
      } catch (error) {
        console.error(`Error procesando EventBook expirado ${eventBook.id}:`, error);
      }
    }
  }
  
  return expiredEventBooks;
};

// Función para verificar si un EventBook está cerrado
export const isEventBookClosed = (eventBook: EventBook): boolean => {
  return eventBook.status === 'closed';
};

const getSnapshotFromStoredBackup = async (
  eventBook: EventBook
): Promise<{ posts: any[]; guests: any[] } | null> => {
  const backupBlob = eventBook.backupData?.blob;
  if (!backupBlob) return null;

  try {
    const base64 = backupBlob.includes(',') ? backupBlob.split(',')[1] : backupBlob;
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const zip = await JSZip.loadAsync(bytes);
    const dataFile = zip.file('eventbook-data.json');
    if (!dataFile) return null;

    const jsonStr = await dataFile.async('string');
    const parsed = JSON.parse(jsonStr || '{}');
    return {
      posts: Array.isArray(parsed.posts) ? parsed.posts : [],
      guests: Array.isArray(parsed.guests) ? parsed.guests : [],
    };
  } catch (error) {
    console.error('Error reading stored EventBook backup:', error);
    return null;
  }
};

// Función para generar PDF del EventBook con layout visual
export const generateEventBookPDF = async (eventBook: EventBook): Promise<void> => {
  try {
    // Crear una ventana temporal con el contenido del EventBook
    const tempWindow = window.open('', '_blank', 'width=1200,height=800');
    if (!tempWindow) {
      throw new Error('No se pudo abrir ventana temporal para generar PDF');
    }

    // Obtener datos del EventBook:
    // - Si está cerrado y existe backupData.blob, usarlo (NO depende de endpoints bloqueados)
    // - Si no, usar endpoints como antes
    let posts: any[] = [];
    let guests: any[] = [];

    const snapshot = isEventBookClosed(eventBook) ? await getSnapshotFromStoredBackup(eventBook) : null;
    if (snapshot) {
      posts = snapshot.posts;
      guests = snapshot.guests;
    } else {
      posts = isEventBookClosed(eventBook)
        ? await eventBookStorage.getBackupPosts(eventBook.id)
        : await eventBookStorage.getAllPosts(eventBook.id);
      // Preferir feed de moderación (incluye pendientes/reportados) cuando hay sesión
      try {
        if (!isEventBookClosed(eventBook)) {
          const feed = await eventBookStorage.getModerationFeed(eventBook.id);
          if (feed?.posts) posts = feed.posts;
        }
      } catch {
        // best-effort
      }
      guests = await guestStorage.getAllGuests(eventBook.id);
    }

    // HTML del EventBook para PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>${eventBook.name} - EventBook</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              margin: 0; padding: 20px; background: #f9fafb; 
            }
            .container { max-width: 800px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
              color: white; padding: 40px 30px; text-align: center; 
            }
            .header h1 { margin: 0; font-size: 2.5rem; font-weight: bold; }
            .header p { margin: 10px 0 0; opacity: 0.9; font-size: 1.1rem; }
            .content { padding: 30px; }
            .post { 
              border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 20px; 
              background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.1); 
            }
            .post-header { display: flex; align-items: center; margin-bottom: 15px; }
            .post-avatar { 
              width: 40px; height: 40px; border-radius: 50%; background: #667eea; 
              display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; 
            }
            .post-info { margin-left: 12px; }
            .post-author { font-weight: 600; color: #1f2937; }
            .post-date { color: #6b7280; font-size: 0.875rem; }
            .post-content { margin-bottom: 15px; line-height: 1.6; color: #374151; }
            .post-image { width: 100%; max-width: 500px; border-radius: 8px; margin: 15px 0; }
            .reactions { display: flex; gap: 15px; margin-top: 15px; }
            .reaction { 
              display: flex; align-items: center; gap: 5px; padding: 6px 12px; 
              background: #f3f4f6; border-radius: 20px; font-size: 0.875rem; 
            }
            .comments { margin-top: 20px; padding-top: 15px; border-top: 1px solid #e5e7eb; }
            .comment { margin-bottom: 15px; padding-left: 20px; }
            .comment-author { font-weight: 600; color: #1f2937; margin-bottom: 5px; }
            .comment-content { color: #374151; line-height: 1.5; }
            .stats { 
              display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; 
              margin-bottom: 30px; padding: 20px; background: #f9fafb; border-radius: 8px; 
            }
            .stat { text-align: center; }
            .stat-number { font-size: 2rem; font-weight: bold; color: #667eea; }
            .stat-label { color: #6b7280; font-size: 0.875rem; margin-top: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${eventBook.name}</h1>
              <p>${eventBook.description || 'EventBook cerrado - Backup generado automáticamente'}</p>
            </div>
            <div class="content">
              <div class="stats">
                <div class="stat">
                  <div class="stat-number">${posts.length}</div>
                  <div class="stat-label">Posts</div>
                </div>
                <div class="stat">
                  <div class="stat-number">${posts.reduce((acc, post) => acc + (post.comments?.length || 0), 0)}</div>
                  <div class="stat-label">Comentarios</div>
                </div>
                <div class="stat">
                  <div class="stat-number">${guests.length}</div>
                  <div class="stat-label">Invitados</div>
                </div>
              </div>
              
              ${posts.map(post => `
                <div class="post">
                  <div class="post-header">
                    <div class="post-avatar">P</div>
                    <div class="post-info">
                      <div class="post-author">Post del EventBook</div>
                      <div class="post-date">${new Date(post.createdAt).toLocaleDateString('es-ES')}</div>
                    </div>
                  </div>
                  <div class="post-content">${post.content}</div>
                  ${
                    post.mediaFiles && post.mediaFiles[0]
                      ? `<img src="${post.mediaFiles[0].base64 || post.mediaFiles[0].url}" alt="Imagen del post" class="post-image" />`
                      : ''
                  }
                  
                  <div class="reactions">
                    <div class="reaction">❤️ ${post.reactions?.love || 0}</div>
                    <div class="reaction">👍 ${post.reactions?.like || 0}</div>
                    <div class="reaction">😂 ${post.reactions?.laugh || 0}</div>
                    <div class="reaction">😮 ${post.reactions?.wow || 0}</div>
                    <div class="reaction">😢 ${post.reactions?.sad || 0}</div>
                    <div class="reaction">😡 ${post.reactions?.angry || 0}</div>
                  </div>
                  
                  ${post.comments && post.comments.length > 0 ? `
                    <div class="comments">
                      ${post.comments.map((comment: any) => `
                        <div class="comment">
                          <div class="comment-author">Comentario</div>
                          <div class="comment-content">${comment.content}</div>
                        </div>
                      `).join('')}
                    </div>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        </body>
      </html>
    `;

    // Escribir contenido en la ventana temporal
    tempWindow.document.write(htmlContent);
    tempWindow.document.close();

    // Esperar a que se carguen las imágenes
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Capturar como canvas
    const canvas = await html2canvas(tempWindow.document.body, {
      width: 1200,
      height: tempWindow.document.body.scrollHeight,
      useCORS: true,
      allowTaint: true,
      scale: 2
    });

    // Cerrar ventana temporal
    tempWindow.close();

    // Crear PDF
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 295; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;

    let position = 0;

    // Agregar primera página
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // Agregar páginas adicionales si es necesario
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    // Descargar PDF
    pdf.save(`${eventBook.name}-EventBook-Backup.pdf`);

  } catch (error) {
    console.error('Error generando PDF:', error);
    throw error;
  }
};

// Función para verificar si un EventBook debe cerrarse
export const shouldEventBookClose = (eventBook: EventBook): boolean => {
  const closeDate = eventBook.settings.visibility?.closeDate;
  if (!closeDate || eventBook.status === 'closed') return false;
  
  return new Date(closeDate) <= new Date();
};
