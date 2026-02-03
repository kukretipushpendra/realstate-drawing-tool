import React from 'react';
import DrawingTabContainer from './components/drawing-tab/DrawingTabContainer';

const App: React.FC = () => {
  return (
    <div style={{ width: '100%', height: '100vh', margin: 0, padding: 0 }}>
      <DrawingTabContainer />
    </div>
  );
};

export default App;
