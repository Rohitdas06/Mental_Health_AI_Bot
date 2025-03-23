const express = require("express");
const twilio = require("twilio");
const { db } = require("./firebaseConfig");
const { sendWhatsAppMessage } = require("./twilioService");
require("dotenv").config();

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
app.get("/",function(req,res){
	res.json({
		msg:"Message Sent Successfully!"
	})
})
app.post("/sendMessage", async (req, res) => {
    const { phone, message } = req.body;

    try {
        await sendWhatsAppMessage(phone, message);
        res.status(200).send({ message: "Message sent successfully!" });
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

// IVR System
app.post("/ivr", (req, res) => {
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say("Welcome to the Mental Health AI helpline. Press 1 for meditation guidance, press 2 to speak with a specialist.");
    twiml.gather({ numDigits: 1, action: "/handle-ivr" });
    res.type("text/xml").send(twiml.toString());
});

app.post("/handle-ivr", (req, res) => {
    const digit = req.body.Digits;
    const twiml = new twilio.twiml.VoiceResponse();

    if (digit === "1") {
        twiml.say("Playing meditation guidance now.");
        twiml.play("https://www.example.com/meditation.mp3");
    } else if (digit === "2") {
        twiml.say("Connecting you to a specialist.");
        twiml.dial("+1234567890");
    } else {
        twiml.say("Invalid option. Please try again.");
    }

    res.type("text/xml").send(twiml.toString());
});

// SMS Chatbot
app.post("/sms", async (req, res) => {
    const { From, Body } = req.body;
    const userRef = db.collection("Users").doc(From);
    await userRef.set({ phone: From, lastMessage: Body, timestamp: new Date() }, { merge: true });

    let responseMessage = "Hello! How can I assist you today? Reply with HELP for options.";
    if (Body.toLowerCase() === "help") {
        responseMessage = "You can ask me about mental health tips, meditation, or speak with a specialist.";
    }

    await twilioClient.messages.create({
        body: responseMessage,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: From,
    });

    res.send("SMS processed");
});

// ✅ WhatsApp Chatbot with Google Dialogflow + Translate
const dialogflow = require("dialogflow");
const { Translate } = require("@google-cloud/translate").v2;

const translate = new Translate({ key: process.env.GOOGLE_TRANSLATE_KEY });
const sessionClient = new dialogflow.SessionsClient();

async function processMessage(userMessage) {
    const sessionPath = sessionClient.sessionPath(process.env.DIALOGFLOW_PROJECT_ID, "12345");
    const request = { session: sessionPath, queryInput: { text: { text: userMessage, languageCode: "en" } } };
    const responses = await sessionClient.detectIntent(request);
    return responses[0].queryResult.fulfillmentText;
}

app.post("/whatsapp", async (req, res) => {
    const { From, Body } = req.body;
    let translatedMessage = await translate.translate(Body, "en");

    const responseMessage = await processMessage(translatedMessage[0]);

    await twilioClient.messages.create({ body: responseMessage, from: process.env.TWILIO_PHONE_NUMBER, to: From });
    res.send("WhatsApp processed");
});

app.listen(3000, () => console.log("Server running on port 3000"));
