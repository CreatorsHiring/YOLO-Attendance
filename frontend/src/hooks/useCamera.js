import { useState, useRef, useEffect, useCallback } from 'react';

export function useCamera() {
  const [stream, setStream] = useState(null);
  const [permissionState, setPermissionState] = useState('prompt');
  const [errorMessage, setErrorMessage] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [facingMode, setFacingMode] = useState('user'); // 'user' or 'environment'

  // Ref callback pattern to ensure video element is immediately bound when mounted
  const videoElementRef = useRef(null);

  const videoRef = useCallback((node) => {
    if (node) {
      videoElementRef.current = node;
      node.muted = true;
      node.playsInline = true;
      node.setAttribute('playsinline', 'true');
      node.setAttribute('webkit-playsinline', 'true');

      if (stream && node.srcObject !== stream) {
        node.srcObject = stream;
        node.play().then(() => setIsReady(true)).catch(() => {});
      }
    } else {
      videoElementRef.current = null;
    }
  }, [stream]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoElementRef.current) {
      videoElementRef.current.srcObject = null;
    }
    setIsReady(false);
  }, [stream]);

  const startCamera = useCallback(async (mode = facingMode) => {
    setErrorMessage('');
    setIsReady(false);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setPermissionState('denied');
        setErrorMessage('Camera access requires HTTPS or localhost.');
        return;
      }

      // Stop previous tracks if switching
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }

      let mediaStream = null;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
      } catch (e) {
        // Fallback for devices that fail ideal constraints
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: mode },
          audio: false
        });
      }

      setStream(mediaStream);
      setPermissionState('granted');

      const video = videoElementRef.current;
      if (video) {
        video.srcObject = mediaStream;
        video.muted = true;
        video.playsInline = true;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');

        const attemptPlay = () => {
          video.play()
            .then(() => setIsReady(true))
            .catch((err) => {
              console.warn('Autoplay waiting for loadeddata:', err);
            });
        };

        video.onloadeddata = attemptPlay;
        video.oncanplay = attemptPlay;
        attemptPlay();
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setPermissionState('denied');
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage('Camera permission was denied. Please allow camera access in your phone settings.');
      } else {
        setErrorMessage(`Camera error: ${err.message || 'Unable to open camera'}`);
      }
    }
  }, [facingMode, stream]);

  // Initial startup on mount
  useEffect(() => {
    let active = true;

    async function init() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false
        });

        if (!active) {
          mediaStream.getTracks().forEach((t) => t.stop());
          return;
        }

        setStream(mediaStream);
        setPermissionState('granted');

        const video = videoElementRef.current;
        if (video) {
          video.srcObject = mediaStream;
          video.muted = true;
          video.playsInline = true;
          video.setAttribute('playsinline', 'true');
          video.setAttribute('webkit-playsinline', 'true');
          video.play()
            .then(() => setIsReady(true))
            .catch(() => {});
        }
      } catch (err) {
        if (active) {
          console.error('Auto-start camera error:', err);
          setErrorMessage(err.message || 'Unable to start camera.');
        }
      }
    }

    init();

    return () => {
      active = false;
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []); // Run strictly once on mount

  const toggleFacingMode = useCallback(() => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    startCamera(nextMode);
  }, [facingMode, startCamera]);

  const capturePhotoBlob = useCallback(() => {
    const video = videoElementRef.current;
    if (!video) return null;

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, width, height);

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          resolve({
            blob,
            dataUrl: canvas.toDataURL('image/jpeg', 0.92)
          });
        },
        'image/jpeg',
        0.92
      );
    });
  }, [facingMode]);

  return {
    videoRef,
    isReady,
    permissionState,
    errorMessage,
    startCamera,
    stopCamera,
    toggleFacingMode,
    facingMode,
    capturePhotoBlob
  };
}
