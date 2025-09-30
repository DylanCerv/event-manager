declare module 'html5-qrcode' {
  export interface Html5QrcodeScannerConfig {
    fps?: number;
    qrbox?: { width: number; height: number } | number;
    aspectRatio?: number;
    disableFlip?: boolean;
  }

  export type QrcodeSuccessCallback = (decodedText: string, decodedResult: any) => void;
  export type QrcodeErrorCallback = (error: string) => void;

  export class Html5QrcodeScanner {
    constructor(
      elementId: string,
      config: Html5QrcodeScannerConfig,
      verbose?: boolean
    );

    render(
      qrCodeSuccessCallback: QrcodeSuccessCallback,
      qrCodeErrorCallback?: QrcodeErrorCallback
    ): void;

    clear(): Promise<void>;
  }

  export class Html5Qrcode {
    constructor(elementId: string, verbose?: boolean);

    start(
      cameraIdOrConfig: string | MediaTrackConstraints,
      configuration: Html5QrcodeScannerConfig,
      qrCodeSuccessCallback: QrcodeSuccessCallback,
      qrCodeErrorCallback?: QrcodeErrorCallback
    ): Promise<void>;

    stop(): Promise<void>;
    clear(): void;
  }
} 