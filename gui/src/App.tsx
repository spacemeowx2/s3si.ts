import 'i18n/config';
import { Routes, Route } from "react-router-dom";
import { Layout } from "components/Layout";
import { Home } from "pages/Home";
import { Settings } from "pages/Settings";
import { Guide } from 'pages/Guide';
import { useShowWindow } from 'hooks/useShowWindow';
import { AppContextProvider } from 'context/app';

function App() {
  useShowWindow();
  return (
    <AppContextProvider>
      <Routes>
        <Route path='/' element={<Layout />}>
          <Route index element={<Home />} />
          <Route path='/settings' element={<Settings />} />
          <Route path='/guide' element={<Guide />} />
        </Route>
      </Routes>
    </AppContextProvider>
  );
}

export default App;
