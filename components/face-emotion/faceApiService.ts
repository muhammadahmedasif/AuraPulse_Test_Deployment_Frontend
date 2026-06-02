import * as faceapi from 'face-api.js';

let modelsLoaded = false;
let isInitializing = false;

export const initializeFaceApi = async (modelsUrl = '/models') => {
  if (modelsLoaded) return;
  if (isInitializing) {
    // Wait until initialized if it's already in progress
    return new Promise(resolve => {
      const interval = setInterval(() => {
        if (modelsLoaded) {
          clearInterval(interval);
          resolve(true);
        }
      }, 100);
    });
  }

  isInitializing = true;
  try {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(modelsUrl),
      faceapi.nets.faceExpressionNet.loadFromUri(modelsUrl)
    ]);
    modelsLoaded = true;
  } catch (error) {
    console.error('Failed to load face-api models', error);
    throw error;
  } finally {
    isInitializing = false;
  }
};

export const detectEmotion = async (videoElement: HTMLVideoElement) => {
  if (!modelsLoaded) {
    await initializeFaceApi();
  }
  
  if (videoElement.readyState === 4) {
    const detection = await faceapi.detectSingleFace(
      videoElement,
      new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })
    ).withFaceExpressions();
    
    return detection?.expressions;
  }
  return null;
};
