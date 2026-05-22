import { GoogleGenAI } from '@google/genai';

async function run() {
  process.env.GOOGLE_CLOUD_PROJECT = 'project-fdbf43b8-e8ee-4b6a-90a';
  process.env.GOOGLE_CLOUD_LOCATION = 'us-central1';
  process.env.GOOGLE_APPLICATION_CREDENTIALS = './vertex-key.json'; 

  const ai = new GoogleGenAI({
    vertexai: true,
    googleAuthOptions: {
      credentials: {
        client_email: 'fake@fake.com',
        private_key: 'random garbage string that is not pem'
      }
    }
  });

  try {
    const res = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: 'hello'
    });
    console.log("SUCCESS:", res.text);
  } catch (e) {
    console.log("ERROR:", e.message);
  }
}
run();
