import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

import React from 'react';
import ReactDOM from 'react-dom/client';

import Map from './Map'
import Vendo from './Vendo'
import ReservedItems from './ReservedItems';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

function App() {
  return (
    <Router>
      <Routes>
        <Route path='/' exact element={<Map />} />
        <Route path='/vendo/:vendoId' exact element={<Vendo />} />
        <Route path='/vendo/:vendoId/reserved' exact element={<ReservedItems />} />
      </Routes>
    </Router>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <App />
);
// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
