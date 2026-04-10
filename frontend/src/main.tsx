import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { CustomProvider } from 'rsuite'
import 'rsuite/dist/rsuite.min.css'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <CustomProvider theme="dark">
        <App />
      </CustomProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
