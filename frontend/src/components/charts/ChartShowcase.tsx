import type { CSSProperties } from 'react';
import { BarChart, LineChart } from '.';

const containerStyle: CSSProperties = {
  display: 'grid',
  gap: '1.5rem',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
};

const cardStyle: CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '1rem',
  boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)',
  padding: '1.5rem',
  border: '1px solid rgba(148, 163, 184, 0.15)',
};

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '1rem',
};

const captionStyle: CSSProperties = {
  fontSize: '0.875rem',
  color: 'rgb(100 116 139)',
};

const ChartShowcase = () => (
  <section>
    <h2>차트 라이브러리 연동 미리보기</h2>
    <p>
      <strong>Chart.js</strong> 기반의 <em>Bar</em> · <em>Line</em> 차트를 연동했습니다. 아래 예시는 더미 데이터를 활용한
      기본 스타일이며, 추후 위젯 시스템에서 동일한 컴포넌트를 재사용할 수 있습니다.
    </p>
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={headerStyle}>
          <div>
            <h3 style={{ margin: 0 }}>매출 채널 비교</h3>
            <p style={captionStyle}>채널별 분기 매출 성장을 비교하는 막대형 차트</p>
          </div>
        </div>
        <BarChart />
      </div>
      <div style={cardStyle}>
        <div style={headerStyle}>
          <div>
            <h3 style={{ margin: 0 }}>월별 퍼널 지표</h3>
            <p style={captionStyle}>신규 가입자와 유료 전환 추이를 나타낸 선형 차트</p>
          </div>
        </div>
        <LineChart />
      </div>
    </div>
  </section>
);

export default ChartShowcase;
