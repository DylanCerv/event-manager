/** Public Invitation API endpoints (no auth required) */

export const getInvitationByQrCodeAPI = async (qrCode: string): Promise<any> => {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/invitations/${encodeURIComponent(qrCode)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Error al obtener la invitación');
    }
    return data;
  } catch (error) {
    console.error('Error en getInvitationByQrCodeAPI:', error);
    throw error;
  }
};

export const updateInvitationGuestByQrCodeAPI = async (qrCode: string, body: object): Promise<any> => {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/invitations/${encodeURIComponent(qrCode)}/guest`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Error al actualizar el invitado');
    }
    return data;
  } catch (error) {
    console.error('Error en updateInvitationGuestByQrCodeAPI:', error);
    throw error;
  }
};

