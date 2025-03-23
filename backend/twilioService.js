require("dotenv").config();
const twilio = require("twilio");

const client = new twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

async function sendWhatsAppMessage(to, message) {
    try {
        await client.messages.create({
            from: process.env.TWILIO_WHATSAPP_NUMBER,
            to: `whatsapp:${to}`,
            body: message,
        });

        console.log("Message sent successfully!");
    } catch (error) {
        console.error("Error sending message:", error);
    }
}

module.exports = { sendWhatsAppMessage };
