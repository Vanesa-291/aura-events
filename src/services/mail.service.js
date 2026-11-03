// Acá vive todo lo relacionado con enviar emails con Nodemailer. Está en un
// service propio (y no adentro del de tickets) por la misma razón que
// utils/jwt.js concentra todo lo de JWT: si mañana hay que cambiar de
// proveedor de correo, o sumar otro tipo de aviso (por ejemplo, el de una
// cancelación), es un cambio en un solo lugar y el resto del proyecto ni
// se entera.
//
// Las credenciales (MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASS, MAIL_FROM)
// salen de las variables de entorno, vía config/env.config.js. Nunca están
// escritas en el código.

import nodemailer from 'nodemailer';
import {
  MAIL_HOST,
  MAIL_PORT,
  MAIL_USER,
  MAIL_PASS,
  MAIL_FROM,
  MAIL_CONFIGURED,
} from '../config/env.config.js';

// El "transporter" es el objeto de Nodemailer que sabe conectarse al
// servidor de correo (SMTP). Se crea una sola vez, la primera vez que se
// necesita, y se reutiliza.
let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: MAIL_HOST,
      port: MAIL_PORT,
      // El puerto 465 usa conexión segura desde el primer momento. Los
      // otros puertos comunes (587, 2525) empiezan en texto plano y pasan
      // a cifrado con STARTTLS, algo que Nodemailer negocia solo.
      secure: MAIL_PORT === 465,
      auth: { user: MAIL_USER, pass: MAIL_PASS },
      // Tiempos máximos de espera: si el servidor de correo no responde, la
      // inscripción no se queda colgada esperando para siempre.
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
  }
  return transporter;
}

// Los datos del evento los carga el organizer, así que antes de meterlos en
// un email en formato HTML se "escapan" los caracteres especiales (< > & ").
// Sin esto, un título con código HTML podría alterar el contenido del mail.
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(date) {
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(new Date(date));
}

function formatPrice(total) {
  if (!total) return 'Gratuito';
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(total);
}

// Arma el asunto, el texto plano y el HTML del email de confirmación.
// Separado del envío para que sea fácil de leer (y de probar) por su cuenta.
export function buildConfirmationEmail({ event, ticket }) {
  const title = event.title;
  const when = formatDate(event.date);
  const total = formatPrice((event.price || 0) * ticket.quantity);
  const places = ticket.quantity === 1 ? '1 lugar' : `${ticket.quantity} lugares`;

  const subject = `Inscripción confirmada: ${title}`;

  const text = [
    '¡Tu inscripción está confirmada!',
    '',
    `Evento: ${title}`,
    `Fecha: ${when}`,
    `Lugar: ${event.location}`,
    `Reservaste: ${places}`,
    `Total: ${total}`,
    '',
    `Tu código de reserva es: ${ticket.reservationCode}`,
    'Guardalo: lo vas a necesitar para identificar tu inscripción.',
    '',
    'Aura Events',
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; color: #222;">
      <h2 style="color: #5b3cc4;">¡Tu inscripción está confirmada!</h2>
      <p>Estos son los datos de tu reserva:</p>
      <table style="border-collapse: collapse; width: 100%;">
        <tr><td style="padding: 6px 0;"><strong>Evento</strong></td><td>${escapeHtml(title)}</td></tr>
        <tr><td style="padding: 6px 0;"><strong>Fecha</strong></td><td>${escapeHtml(when)}</td></tr>
        <tr><td style="padding: 6px 0;"><strong>Lugar</strong></td><td>${escapeHtml(event.location)}</td></tr>
        <tr><td style="padding: 6px 0;"><strong>Reservaste</strong></td><td>${escapeHtml(places)}</td></tr>
        <tr><td style="padding: 6px 0;"><strong>Total</strong></td><td>${escapeHtml(total)}</td></tr>
      </table>
      <p style="margin-top: 20px;">Tu código de reserva es:</p>
      <p style="font-size: 22px; font-weight: bold; letter-spacing: 2px; color: #5b3cc4;">${escapeHtml(ticket.reservationCode)}</p>
      <p style="color: #666; font-size: 13px;">Guardalo: lo vas a necesitar para identificar tu inscripción.</p>
      <p style="color: #666; font-size: 13px;">Aura Events</p>
    </div>
  `;

  return { subject, text, html };
}

class MailService {
  // Envía el email de confirmación de una inscripción. Devuelve true si el
  // servidor de correo lo aceptó y false si no se pudo enviar (porque el
  // correo no está configurado o porque el envío falló).
  //
  // A propósito, esta función NUNCA lanza un error hacia afuera: la
  // inscripción ya quedó guardada, y un problema con el correo no debe
  // convertirla en un error ni hacer que la persona crea que no se anotó.
  // El detalle del problema queda anotado en la consola del servidor.
  async sendTicketConfirmation({ to, event, ticket }) {
    if (!MAIL_CONFIGURED) {
      console.warn('Email de confirmación no enviado: falta configurar las variables MAIL_* en .env');
      return false;
    }

    try {
      const { subject, text, html } = buildConfirmationEmail({ event, ticket });

      await getTransporter().sendMail({
        from: MAIL_FROM,
        to,
        subject,
        text,
        html,
      });

      return true;
    } catch (err) {
      console.error('No se pudo enviar el email de confirmación:', err.message);
      return false;
    }
  }
}

export default MailService;
