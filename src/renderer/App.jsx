import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import icon from '../../assets/icon.svg';
import './App.css';
import MainMenu from './components/main_menu';
import { ChakraProvider } from '@chakra-ui/react'

export default function App() {
  return (

    <ChakraProvider>
      <Router>
        <Routes>
          <Route path="/" element={<MainMenu />} />
        </Routes>
      </Router>
    </ChakraProvider>
  );
}
