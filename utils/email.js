import { Resend } from 'resend';
import configs from "../configs/configs.js";

const sendEmail = async (options) => {
  try {
    // Crear instancia de Resend con la API key
    const resend = new Resend(configs.RESEND_API_KEY);

    // Enviar el email usando Resend
    const data = await resend.emails.send({
      from: 'Ideal Space <onboarding@resend.dev>', // Puedes personalizar esto cuando tengas un dominio verificado
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.htmlContent || options.html || `<p>${options.message}</p>`, // Soportamos htmlContent o html
    });

    return data;
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send email');
  }
};

export default sendEmail;