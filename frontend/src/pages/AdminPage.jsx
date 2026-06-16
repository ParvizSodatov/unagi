import PageHero from '../components/PageHero'

export default function AdminPage() {
  // Пока просто форма входа (заглушка). Настоящую авторизацию и панель сделаем позже.
  return (
    <>
      <PageHero eyebrow="для персонала" title="Вход в админку" />
      <section className="section">
        <div className="container">
          <form className="admin-login" onSubmit={(e) => e.preventDefault()}>
            <label className="admin-login__field">
              <span>Логин</span>
              <input type="text" placeholder="admin" />
            </label>
            <label className="admin-login__field">
              <span>Пароль</span>
              <input type="password" placeholder="••••••••" />
            </label>
            <button type="submit" className="btn btn--primary admin-login__btn">Войти</button>
            <p className="admin-login__note">Панель управления меню и заказами — в разработке</p>
          </form>
        </div>
      </section>
    </>
  )
}
