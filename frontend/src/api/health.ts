export interface HealthResponse {
  message: string;
  timestamp: string;
}

export const fetchHealth = async (): Promise<HealthResponse> => {
  const response = await fetch('/api/health');

  if (!response.ok) {
    throw new Error('백엔드 서버 응답이 올바르지 않습니다.');
  }

  const data = (await response.json()) as HealthResponse;
  return data;
};
