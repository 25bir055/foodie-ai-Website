import axios from 'axios';
import { getApiBaseUrl } from './api';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Ask Foodie AI via Groq backend route with full personalization & multilingual support
 */
export async function askOpenAI(userQuestion, product = null, userProfile = null, prescriptionInfo = null, scanHistory = null) {
  const API_URL = getApiBaseUrl();
  try {
    const response = await axios.post(
      `${API_URL}/chat`,
      {
        prompt: userQuestion,
        product,
        userProfile,
        prescriptionInfo,
        scanHistory,
      },
      { headers: getHeaders() }
    );

    if (response.data && response.data.reply) {
      return {
        reply: response.data.reply,
        detectedLanguage: response.data.detectedLanguage || 'en-IN',
        languageName: response.data.languageName || 'English'
      };
    } else {
      throw new Error('Invalid response received from Foodie AI');
    }
  } catch (err) {
    console.error('Foodie AI Chat API call failed:', err.response?.data?.error || err.message);
    const backendError = err.response?.data?.error;
    if (backendError) {
      throw new Error(backendError);
    }
    throw err;
  }
}

/**
 * Fetch Chat History
 */
export async function fetchChatHistory() {
  const API_URL = getApiBaseUrl();
  try {
    const response = await axios.get(`${API_URL}/chat/history`, { headers: getHeaders() });
    return response.data || [];
  } catch (err) {
    console.error('Failed to fetch chat history:', err);
    return [];
  }
}

/**
 * Clear Chat History
 */
export async function clearChatHistory() {
  const API_URL = getApiBaseUrl();
  try {
    const response = await axios.delete(`${API_URL}/chat/history`, { headers: getHeaders() });
    return response.data;
  } catch (err) {
    console.error('Failed to clear chat history:', err);
    return null;
  }
}

/**
 * Transcribe Audio (Whisper) with Multilingual Language Detection
 */
export async function transcribeAudio(audioBlob) {
  const API_URL = getApiBaseUrl();
  try {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'audio_recording.webm');

    const response = await axios.post(`${API_URL}/chat/audio`, formData, {
      headers: {
        ...getHeaders(),
        'Content-Type': 'multipart/form-data',
      },
    });

    return {
      transcript: response.data.transcript || '',
      detectedLanguage: response.data.detectedLanguage || 'en-IN',
      languageName: response.data.languageName || 'English'
    };
  } catch (err) {
    console.error('Failed to transcribe audio:', err.response?.data?.error || err.message);
    throw err;
  }
}
