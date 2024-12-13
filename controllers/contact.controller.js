import { Flat } from "../models/flat.models.js";
import sendEmail from "../utils/email.js";
import { logError } from "../utils/logger.js";

const contactOwner = async (req, res) => {
    try {
        const { flatId } = req.params;
        const { name, cedula, email, message } = req.body;

        // Buscar el flat y obtener la información del dueño
        const flat = await Flat.findById(flatId)
            .populate('owner', 'email firstName lastName');

        if (!flat) {
            return res.status(404).json({
                success: false,
                message: "Flat not found"
            });
        }

        // Construir el mensaje de correo con formato HTML
        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background-color: #17A5AA; padding: 20px; color: white; text-align: center;">
                    <h1 style="margin: 0;">Nueva Solicitud de Contacto</h1>
                </div>
                
                <div style="padding: 20px; background-color: #f9f9f9; border-radius: 4px; margin-top: 20px;">
                    <h2>Estimado/a ${flat.owner.firstName} ${flat.owner.lastName},</h2>
                    
                    <p>Ha recibido una nueva solicitud de contacto para su propiedad:</p>
                    <h3 style="color: #17A5AA;">"${flat.title}"</h3>
                    
                    <div style="background-color: white; padding: 15px; border-left: 4px solid #17A5AA; margin: 20px 0;">
                        <h3 style="color: #17A5AA; margin-top: 0;">Detalles del interesado:</h3>
                        <p><strong>Nombre:</strong> ${name}</p>
                        <p><strong>Cédula:</strong> ${cedula}</p>
                        <p><strong>Correo electrónico:</strong> <a href="mailto:${email}" style="color: #17A5AA;">${email}</a></p>
                    </div>
                    
                    <div style="background-color: white; padding: 15px; border-left: 4px solid #17A5AA;">
                        <h3 style="color: #17A5AA; margin-top: 0;">Mensaje del interesado:</h3>
                        <p style="white-space: pre-line;">${message}</p>
                    </div>
                </div>
                
                <div style="margin-top: 20px; padding: 20px; background-color: #f5f5f5; font-size: 12px; color: #666; text-align: center;">
                    <p>Este es un mensaje automático, por favor no responda directamente a este correo.</p>
                    <p>Para contactar al interesado, utilice el correo electrónico: <a href="mailto:${email}" style="color: #17A5AA;">${email}</a></p>
                    <hr style="border: 1px solid #ddd; margin: 15px 0;">
                    <p>Saludos,<br>Equipo de Kruger</p>
                </div>
            </div>
        `;

        // Versión en texto plano para clientes que no soportan HTML
        const textContent = `
Estimado/a ${flat.owner.firstName} ${flat.owner.lastName},

Ha recibido una nueva solicitud de contacto para su propiedad:
"${flat.title}"

Detalles del interesado:
------------------------
Nombre: ${name}
Cédula: ${cedula}
Correo electrónico: ${email}

Mensaje del interesado:
----------------------
${message}

-------------------
Este es un mensaje automático, por favor no responda directamente a este correo.
Para contactar al interesado, utilice el correo electrónico proporcionado: ${email}

Saludos,
Equipo de Kruger`;

        // Enviar el correo utilizando el servicio actualizado
        await sendEmail({
            email: flat.owner.email,
            subject: `Nueva solicitud de contacto - Propiedad: ${flat.title}`,
            message: textContent,
            htmlContent: htmlContent // Nuevo campo para el contenido HTML
        });

        console.log(`Message sent successfully to property owner ${flat.owner.email}`);
        res.status(200).json({
            success: true,
            message: "Message sent successfully to property owner"
        });

    } catch (error) {
        logError('Error in contactOwner:', error);
        res.status(500).json({
            success: false,
            message: "Error sending message",
            error: error.message
        });
    }
};

export { contactOwner };