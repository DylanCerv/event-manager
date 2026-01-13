import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import type { Guest } from '../types/event';

export async function generateQRCodeDataURL(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    width: 400,
    margin: 3,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });
}

async function generateSingleGuestPDF(guest: Guest, eventName: string): Promise<Blob> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const qrSize = 110; // Larger QR size for better scanning at entrance
  let currentY = margin;

  // a. Header elegante simplificado
  doc.setFontSize(26);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175); // Azul más elegante
  const logoText = 'Eventos Manager';
  const logoWidth = doc.getTextWidth(logoText);
  const logoX = (pageWidth - logoWidth) / 2;
  doc.text(logoText, logoX, currentY);
  currentY += 15;

  // Línea decorativa simple
  doc.setDrawColor(30, 64, 175);
  doc.setLineWidth(1.2);
  const lineMargin = 15;
  doc.line(lineMargin, currentY, pageWidth - lineMargin, currentY);
  currentY += 20;

  // b. Título en dos líneas con marco decorativo
  const titleBoxY = currentY - 5;
  const titleBoxHeight = 35;
  
  // Fondo sutil para el título
  doc.setFillColor(248, 250, 252); // Gris muy claro
  doc.setDrawColor(203, 213, 225); // Borde gris suave
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, titleBoxY, pageWidth - (margin * 2), titleBoxHeight, 3, 3, 'FD');
  
  // Primera línea: "Invitación a"
  doc.setFontSize(18);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128); // Gris moderno
  const titleLine1 = 'Invitación a';
  const titleLine1Width = doc.getTextWidth(titleLine1);
  const titleLine1X = (pageWidth - titleLine1Width) / 2;
  doc.text(titleLine1, titleLine1X, currentY + 8);
  
  // Segunda línea: Nombre del evento
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42); // Negro más suave
  const titleLine2 = eventName;
  const titleLine2Width = doc.getTextWidth(titleLine2);
  const titleLine2X = (pageWidth - titleLine2Width) / 2;
  doc.text(titleLine2, titleLine2X, currentY + 22);
  currentY += 40;

  // Información del invitado destacada
  if (guest.name || guest.guest_number) {
    // Fondo destacado para el invitado
    const guestBoxY = currentY - 3;
    doc.setFillColor(239, 246, 255); // Azul muy claro
    doc.setDrawColor(147, 197, 253); // Azul suave
    doc.setLineWidth(0.3);
    doc.roundedRect(margin + 20, guestBoxY, pageWidth - (margin * 2) - 40, 16, 2, 2, 'FD');
    
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 64, 175); // Azul elegante
    
    const guestInfo = guest.name ? `Invitado: ${guest.name}` : `Invitado #${guest.guest_number}`;
    const guestInfoWidth = doc.getTextWidth(guestInfo);
    const guestInfoX = (pageWidth - guestInfoWidth) / 2;
    doc.text(guestInfo, guestInfoX, currentY + 6);
    currentY += 20;
  }

  // c. Instrucciones del enlace
  doc.setFontSize(13);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(75, 85, 99); // Gris moderno
  const instructionText = 'Accede a tu invitación digital haciendo click en este enlace:';
  const instructionWidth = doc.getTextWidth(instructionText);
  const instructionX = (pageWidth - instructionWidth) / 2;
  doc.text(instructionText, instructionX, currentY);
  currentY += 15;

  // d. Link con fondo destacado
  const link = `http://localhost:5173/invitation/${guest.qr_code}`;
  
  // Fondo para el enlace
  const linkBoxY = currentY - 4;
  doc.setFillColor(254, 249, 195); // Amarillo muy claro
  doc.setDrawColor(251, 191, 36); // Amarillo suave
  doc.setLineWidth(0.5);
  doc.roundedRect(margin + 10, linkBoxY, pageWidth - (margin * 2) - 20, 18, 3, 3, 'FD');
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(146, 64, 14); // Marrón para el enlace
  const linkWidth = doc.getTextWidth(link);
  const linkX = (pageWidth - linkWidth) / 2;
  doc.text(link, linkX, currentY + 7);
  currentY += 25;

  // e. Título del QR
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129); // Verde elegante
  const qrTitleText = 'Presenta este QR para tu ingreso al evento';
  const qrTitleWidth = doc.getTextWidth(qrTitleText);
  const qrTitleX = (pageWidth - qrTitleWidth) / 2;
  doc.text(qrTitleText, qrTitleX, currentY);
  currentY += 15;
  
  // QR con marco decorativo
  const qrDataUrl = await generateQRCodeDataURL(guest.qr_code);
  const qrX = (pageWidth - qrSize) / 2;
  
  // Marco decorativo para el QR
  const qrFrameSize = qrSize + 8;
  const qrFrameX = (pageWidth - qrFrameSize) / 2;
  doc.setFillColor(255, 255, 255); // Blanco
  doc.setDrawColor(30, 64, 175); // Azul elegante
  doc.setLineWidth(2);
  doc.roundedRect(qrFrameX, currentY - 4, qrFrameSize, qrFrameSize, 5, 5, 'FD');
  
  doc.addImage(
    qrDataUrl,
    'PNG',
    qrX,
    currentY,
    qrSize,
    qrSize
  );
  currentY += qrSize + 10;

  // f. Información adicional con mejor formato
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128);
  
  const additionalInfo1 = '• Este código QR es único y personal para tu acceso';
  const additionalInfo1Width = doc.getTextWidth(additionalInfo1);
  const additionalInfo1X = (pageWidth - additionalInfo1Width) / 2;
  doc.text(additionalInfo1, additionalInfo1X, currentY);
  currentY += 10;
  
  const additionalInfo2 = '• Guarda esta invitación en tu dispositivo móvil';
  const additionalInfo2Width = doc.getTextWidth(additionalInfo2);
  const additionalInfo2X = (pageWidth - additionalInfo2Width) / 2;
  doc.text(additionalInfo2, additionalInfo2X, currentY);
  currentY += 15;
  
  // Footer elegante
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(margin + 30, currentY, pageWidth - margin - 30, currentY);
  currentY += 8;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(156, 163, 175);
  const footerText = 'Generado por Eventos Manager - Sistema de Gestión de Eventos';
  const footerWidth = doc.getTextWidth(footerText);
  const footerX = (pageWidth - footerWidth) / 2;
  doc.text(footerText, footerX, currentY);

  return doc.output('blob');
}

export async function generateGuestQRPDF(guests: Guest[], eventName?: string): Promise<Blob> {
  const zip = new JSZip();

  // Generate individual PDFs for each guest
  for (const guest of guests) {
    if (!guest.qr_code || String(guest.qr_code).trim() === '') {
      // Skip guests without QR (backend should generate it on create/update)
      continue;
    }
    const pdfBlob = await generateSingleGuestPDF(guest, eventName || 'Evento');

    // Create descriptive filename
    const eventNameSlug = (eventName || 'evento').toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    const fileName = `invitacion-${eventNameSlug}-${guest.guest_number?.toString().padStart(3, '0')}.pdf`;
    zip.file(fileName, pdfBlob);
  }

  // Generate ZIP file
  return zip.generateAsync({ type: 'blob' });
}