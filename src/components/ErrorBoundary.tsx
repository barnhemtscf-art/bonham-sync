import React from 'react';
import { Language } from '../types/barnhem';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  lang?: Language;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'Unexpected application error',
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#FFFDF9] p-6">
          <div className="pastel-card w-full max-w-md rounded-[32px] border-2 border-[#F0A8B2] bg-white p-7 text-center shadow-xl">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FADADD] text-3xl">
              🛠️
            </div>
            <h1 className="text-xl font-bold text-[#3B2F2A]">
              เกิดข้อผิดพลาดในการเชื่อมต่อระบบ
            </h1>
            <p className="mt-2 break-words text-xs text-[#705F56]">{this.state.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="pastel-btn mt-5 min-h-[46px] w-full rounded-[18px] bg-[#3B2F2A] px-5 text-sm font-bold text-white"
            >
              โหลดหน้าใหม่ (Reload)
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
