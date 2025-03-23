const speech = require("@google-cloud/speech");
const client = new speech.SpeechClient();

async function analyzeVoice(audioBuffer) {
    const audio = { content: audioBuffer.toString("base64") };
    const request = {
        audio,
        config: { encoding: "LINEAR16", sampleRateHertz: 16000, languageCode: "en-US" },
    };

    const [response] = await client.recognize(request);
    const transcription = response.results.map(result => result.alternatives[0].transcript).join("\n");
    return transcription;
}

module.exports = { analyzeVoice };
const { analyzeVoice } = require("./analyzeVoice");

app.post("/handle-ivr", async (req, res) => {
    const audioBuffer = req.body.RecordingUrl; 
    const transcription = await analyzeVoice(audioBuffer);

    let responseMessage = "We are here to help.";
    if (transcription.includes("sad") || transcription.includes("depressed")) {
        responseMessage = "You're not alone. Would you like to speak with a specialist?";
    }

    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say(responseMessage);
    res.type("text/xml").send(twiml.toString());
});
