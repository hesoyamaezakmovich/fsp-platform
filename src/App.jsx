import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<div>Главная страница</div>} />
        <Route path="/register" element={<div>Страница регистрации</div>} />
        <Route path="/login" element={<div>Страница входа</div>} />
      </Routes>
    </Router>
  );
};

export default App;