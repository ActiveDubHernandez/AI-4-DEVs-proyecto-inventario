import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { MovementFormPage } from './pages/MovementForm';
import { ProductList } from './pages/ProductList';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProductList />} />
        <Route path="/movements/new" element={<MovementFormPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
