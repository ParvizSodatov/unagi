import { Routes, Route, useLocation } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import ScrollToTop from './components/ScrollToTop'
import Home from './pages/Home'
import MenuPage from './pages/MenuPage'
import AboutPage from './pages/AboutPage'
import ContactsPage from './pages/ContactsPage'
import CartPage from './pages/CartPage'
import AdminPage from './pages/AdminPage'
import CourierPage from './pages/CourierPage'

function App() {
  const { pathname } = useLocation()
  // У админки и страницы курьера свой layout — глобальный хедер/футер сайта не показываем.
  const bare = pathname.startsWith('/admin') || pathname.startsWith('/courier')

  return (
    <>
      <ScrollToTop />
      {!bare && <Header />}
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contacts" element={<ContactsPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/courier/:token" element={<CourierPage />} />
        </Routes>
      </main>
      {!bare && <Footer />}
    </>
  )
}

export default App
