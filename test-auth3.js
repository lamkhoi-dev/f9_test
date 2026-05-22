import { GoogleGenAI } from '@google/genai';

async function run() {
  process.env.GOOGLE_CLOUD_PROJECT = 'my-env-project';
  process.env.GOOGLE_CLOUD_LOCATION = 'us-central1';
  process.env.GOOGLE_APPLICATION_CREDENTIALS = './vertex-key.json'; // Assume this file exists or is handled by GoogleAuth

  const ai = new GoogleGenAI({
    vertexai: {
      project: 'fake-project-123',
      location: 'us-central1'
    },
    googleAuthOptions: {
      credentials: {
        client_email: 'fake@fake.com',
        private_key: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n'
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
