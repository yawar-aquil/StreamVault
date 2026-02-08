import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Translation resources
const resources = {
    en: {
        translation: {
            nav: { home: 'Home', movies: 'Movies', shows: 'TV Shows', anime: 'Anime', search: 'Search', watchlist: 'Watchlist', profile: 'Profile', settings: 'Settings', logout: 'Logout', login: 'Login', signup: 'Sign Up' },
            home: { hero: 'Watch Movies & Shows for Free', heroSubtitle: 'Stream the latest movies, TV shows, and anime in HD quality', trending: 'Trending Now', popular: 'Popular', newReleases: 'New Releases', continueWatching: 'Continue Watching', recommended: 'Recommended for You' },
            actions: { play: 'Play', watchNow: 'Watch Now', addToWatchlist: 'Add to Watchlist', removeFromWatchlist: 'Remove from Watchlist', share: 'Share', download: 'Download', like: 'Like', dislike: 'Dislike', subscribe: 'Subscribe', cancel: 'Cancel', save: 'Save', delete: 'Delete', edit: 'Edit', submit: 'Submit', loading: 'Loading...', error: 'Error', success: 'Success' },
            content: { seasons: 'Seasons', episodes: 'Episodes', cast: 'Cast', reviews: 'Reviews', related: 'Related', genre: 'Genre', duration: 'Duration', rating: 'Rating', releaseDate: 'Release Date', director: 'Director', noResults: 'No results found' },
            profile: { level: 'Level', xp: 'XP', streak: 'Watch Streak', badges: 'Badges', achievements: 'Achievements', watchHistory: 'Watch History', favorites: 'Favorites', friends: 'Friends' },
            categories: { action: 'Action', drama: 'Drama', comedy: 'Comedy', thriller: 'Thriller', romance: 'Romance', horror: 'Horror', mystery: 'Mystery' },
            support: { help: 'Help Center', faq: 'FAQs', report: 'Report Issue', request: 'Request Content', api: 'API' },
            footer: { about: 'About', contact: 'Contact', privacy: 'Privacy Policy', terms: 'Terms of Service', copyright: '© 2026 StreamVault. All rights reserved.', quickLinks: 'Quick Links', categories: 'Categories', support: 'Support', stayConnected: 'Stay Connected', subscribe: 'Subscribe', tagline: 'Your Premium Web Series Destination', browse: 'Browse', blog: 'Blog', sitemap: 'Site Map', dmca: 'DMCA' },
        },
    },
    hi: {
        translation: {
            nav: { home: 'होम', movies: 'फ़िल्में', shows: 'टीवी शो', anime: 'एनीमे', search: 'खोजें', watchlist: 'वॉचलिस्ट', profile: 'प्रोफ़ाइल', settings: 'सेटिंग्स', logout: 'लॉग आउट', login: 'लॉग इन', signup: 'साइन अप' },
            home: { hero: 'मुफ़्त में फ़िल्में और शो देखें', heroSubtitle: 'HD क्वालिटी में नवीनतम फ़िल्में, टीवी शो और एनीमे स्ट्रीम करें', trending: 'ट्रेंडिंग', popular: 'लोकप्रिय', newReleases: 'नई रिलीज़', continueWatching: 'देखना जारी रखें', recommended: 'आपके लिए अनुशंसित' },
            actions: { play: 'चलाएं', watchNow: 'अभी देखें', addToWatchlist: 'वॉचलिस्ट में जोड़ें', removeFromWatchlist: 'वॉचलिस्ट से हटाएं', share: 'शेयर करें', download: 'डाउनलोड', like: 'पसंद', dislike: 'नापसंद', subscribe: 'सब्सक्राइब', cancel: 'रद्द करें', save: 'सेव करें', delete: 'हटाएं', edit: 'संपादित करें', submit: 'जमा करें', loading: 'लोड हो रहा है...', error: 'त्रुटि', success: 'सफल' },
            content: { seasons: 'सीज़न', episodes: 'एपिसोड', cast: 'कलाकार', reviews: 'समीक्षाएं', related: 'संबंधित', genre: 'शैली', duration: 'अवधि', rating: 'रेटिंग', releaseDate: 'रिलीज़ की तारीख', director: 'निर्देशक', noResults: 'कोई परिणाम नहीं मिला' },
            profile: { level: 'स्तर', xp: 'एक्सपी', streak: 'वॉच स्ट्रीक', badges: 'बैज', achievements: 'उपलब्धियां', watchHistory: 'देखने का इतिहास', favorites: 'पसंदीदा', friends: 'मित्र' },
            categories: { action: 'एक्शन', drama: 'ड्रामा', comedy: 'कॉमेडी', thriller: 'थ्रिलर', romance: 'रोमांस', horror: 'हॉरर', mystery: 'मिस्ट्री' },
            support: { help: 'सहायता केंद्र', faq: 'FAQs', report: 'समस्या की रिपोर्ट करें', request: 'कंटेंट का अनुरोध करें', api: 'API' },
            footer: { about: 'हमारे बारे में', contact: 'संपर्क करें', privacy: 'गोपनीयता नीति', terms: 'सेवा की शर्तें', copyright: '© 2026 स्ट्रीमवॉल्ट। सर्वाधिकार सुरक्षित।', quickLinks: 'त्वरित लिंक', categories: 'श्रेणियाँ', support: 'सहायता', stayConnected: 'जुड़े रहें', subscribe: 'सब्सक्राइब', tagline: 'आपका प्रीमियम वेब सीरीज गंतव्य', browse: 'ब्राउज़ करें', blog: 'ब्लॉग', sitemap: 'साइट मैप', dmca: 'DMCA' },
        },
    },
    es: {
        translation: {
            nav: { home: 'Inicio', movies: 'Películas', shows: 'Series', anime: 'Anime', search: 'Buscar', watchlist: 'Mi Lista', profile: 'Perfil', settings: 'Configuración', logout: 'Cerrar Sesión', login: 'Iniciar Sesión', signup: 'Registrarse' },
            home: { hero: 'Mira Películas y Series Gratis', heroSubtitle: 'Transmite las últimas películas, series y anime en calidad HD', trending: 'Tendencias', popular: 'Popular', newReleases: 'Nuevos Lanzamientos', continueWatching: 'Continuar Viendo', recommended: 'Recomendado para Ti' },
            actions: { play: 'Reproducir', watchNow: 'Ver Ahora', addToWatchlist: 'Agregar a Mi Lista', removeFromWatchlist: 'Quitar de Mi Lista', share: 'Compartir', download: 'Descargar', like: 'Me Gusta', dislike: 'No Me Gusta', subscribe: 'Suscribirse', cancel: 'Cancelar', save: 'Guardar', delete: 'Eliminar', edit: 'Editar', submit: 'Enviar', loading: 'Cargando...', error: 'Error', success: 'Éxito' },
            content: { seasons: 'Temporadas', episodes: 'Episodios', cast: 'Reparto', reviews: 'Reseñas', related: 'Relacionados', genre: 'Género', duration: 'Duración', rating: 'Calificación', releaseDate: 'Fecha de Estreno', director: 'Director', noResults: 'No se encontraron resultados' },
            profile: { level: 'Nivel', xp: 'XP', streak: 'Racha', badges: 'Insignias', achievements: 'Logros', watchHistory: 'Historial', favorites: 'Favoritos', friends: 'Amigos' },
            footer: { about: 'Acerca de', contact: 'Contacto', privacy: 'Política de Privacidad', terms: 'Términos de Servicio', copyright: '© 2026 StreamVault. Todos los derechos reservados.', quickLinks: 'Enlaces Rápidos', categories: 'Categorías', support: 'Soporte', stayConnected: 'Mantente Conectado', subscribe: 'Suscribirse' },
        },
    },
    fr: {
        translation: {
            nav: { home: 'Accueil', movies: 'Films', shows: 'Séries', anime: 'Anime', search: 'Rechercher', watchlist: 'Ma Liste', profile: 'Profil', settings: 'Paramètres', logout: 'Déconnexion', login: 'Connexion', signup: "S'inscrire" },
            home: { hero: 'Regardez Films et Séries Gratuitement', heroSubtitle: 'Streamez les derniers films, séries TV et anime en qualité HD', trending: 'Tendances', popular: 'Populaire', newReleases: 'Nouvelles Sorties', continueWatching: 'Continuer à Regarder', recommended: 'Recommandé pour Vous' },
            actions: { play: 'Lecture', watchNow: 'Regarder', addToWatchlist: 'Ajouter à Ma Liste', removeFromWatchlist: 'Retirer de Ma Liste', share: 'Partager', download: 'Télécharger', like: 'Aimer', dislike: "Ne pas aimer", subscribe: "S'abonner", cancel: 'Annuler', save: 'Sauvegarder', delete: 'Supprimer', edit: 'Modifier', submit: 'Soumettre', loading: 'Chargement...', error: 'Erreur', success: 'Succès' },
            content: { seasons: 'Saisons', episodes: 'Épisodes', cast: 'Distribution', reviews: 'Critiques', related: 'Similaires', genre: 'Genre', duration: 'Durée', rating: 'Note', releaseDate: 'Date de Sortie', director: 'Réalisateur', noResults: 'Aucun résultat trouvé' },
            profile: { level: 'Niveau', xp: 'XP', streak: 'Série', badges: 'Badges', achievements: 'Succès', watchHistory: 'Historique', favorites: 'Favoris', friends: 'Amis' },
            footer: { about: 'À Propos', contact: 'Contact', privacy: 'Politique de Confidentialité', terms: "Conditions d'Utilisation", copyright: '© 2026 StreamVault. Tous droits réservés.', quickLinks: 'Liens Rapides', categories: 'Catégories', support: 'Support', stayConnected: 'Restez Connecté', subscribe: "S'abonner" },
        },
    },
    de: {
        translation: {
            nav: { home: 'Startseite', movies: 'Filme', shows: 'Serien', anime: 'Anime', search: 'Suchen', watchlist: 'Merkliste', profile: 'Profil', settings: 'Einstellungen', logout: 'Abmelden', login: 'Anmelden', signup: 'Registrieren' },
            home: { hero: 'Filme & Serien Kostenlos Ansehen', heroSubtitle: 'Streame die neuesten Filme, Serien und Anime in HD-Qualität', trending: 'Im Trend', popular: 'Beliebt', newReleases: 'Neuerscheinungen', continueWatching: 'Weiterschauen', recommended: 'Für Dich Empfohlen' },
            actions: { play: 'Abspielen', watchNow: 'Jetzt Ansehen', addToWatchlist: 'Zur Merkliste', removeFromWatchlist: 'Von Merkliste Entfernen', share: 'Teilen', download: 'Herunterladen', like: 'Gefällt mir', dislike: 'Gefällt mir nicht', subscribe: 'Abonnieren', cancel: 'Abbrechen', save: 'Speichern', delete: 'Löschen', edit: 'Bearbeiten', submit: 'Absenden', loading: 'Lädt...', error: 'Fehler', success: 'Erfolg' },
            content: { seasons: 'Staffeln', episodes: 'Folgen', cast: 'Besetzung', reviews: 'Bewertungen', related: 'Ähnliche', genre: 'Genre', duration: 'Dauer', rating: 'Bewertung', releaseDate: 'Erscheinungsdatum', director: 'Regisseur', noResults: 'Keine Ergebnisse gefunden' },
            profile: { level: 'Level', xp: 'XP', streak: 'Serie', badges: 'Abzeichen', achievements: 'Erfolge', watchHistory: 'Verlauf', favorites: 'Favoriten', friends: 'Freunde' },
            footer: { about: 'Über Uns', contact: 'Kontakt', privacy: 'Datenschutz', terms: 'Nutzungsbedingungen', copyright: '© 2026 StreamVault. Alle Rechte vorbehalten.', quickLinks: 'Schnelllinks', categories: 'Kategorien', support: 'Support', stayConnected: 'Bleib Verbunden', subscribe: 'Abonnieren' },
        },
    },
    pt: {
        translation: {
            nav: { home: 'Início', movies: 'Filmes', shows: 'Séries', anime: 'Anime', search: 'Pesquisar', watchlist: 'Minha Lista', profile: 'Perfil', settings: 'Configurações', logout: 'Sair', login: 'Entrar', signup: 'Cadastrar' },
            home: { hero: 'Assista Filmes e Séries Grátis', heroSubtitle: 'Transmita os filmes, séries e animes mais recentes em qualidade HD', trending: 'Em Alta', popular: 'Popular', newReleases: 'Lançamentos', continueWatching: 'Continuar Assistindo', recommended: 'Recomendado para Você' },
            actions: { play: 'Reproduzir', watchNow: 'Assistir Agora', addToWatchlist: 'Adicionar à Lista', removeFromWatchlist: 'Remover da Lista', share: 'Compartilhar', download: 'Baixar', like: 'Curtir', dislike: 'Não Curtir', subscribe: 'Inscrever-se', cancel: 'Cancelar', save: 'Salvar', delete: 'Excluir', edit: 'Editar', submit: 'Enviar', loading: 'Carregando...', error: 'Erro', success: 'Sucesso' },
            content: { seasons: 'Temporadas', episodes: 'Episódios', cast: 'Elenco', reviews: 'Avaliações', related: 'Relacionados', genre: 'Gênero', duration: 'Duração', rating: 'Nota', releaseDate: 'Data de Lançamento', director: 'Diretor', noResults: 'Nenhum resultado encontrado' },
            profile: { level: 'Nível', xp: 'XP', streak: 'Sequência', badges: 'Medalhas', achievements: 'Conquistas', watchHistory: 'Histórico', favorites: 'Favoritos', friends: 'Amigos' },
            footer: { about: 'Sobre', contact: 'Contato', privacy: 'Política de Privacidade', terms: 'Termos de Serviço', copyright: '© 2026 StreamVault. Todos os direitos reservados.', quickLinks: 'Links Rápidos', categories: 'Categorias', support: 'Suporte', stayConnected: 'Fique Conectado', subscribe: 'Inscrever-se' },
        },
    },
    it: {
        translation: {
            nav: { home: 'Home', movies: 'Film', shows: 'Serie TV', anime: 'Anime', search: 'Cerca', watchlist: 'La Mia Lista', profile: 'Profilo', settings: 'Impostazioni', logout: 'Esci', login: 'Accedi', signup: 'Registrati' },
            home: { hero: 'Guarda Film e Serie Gratis', heroSubtitle: 'Trasmetti gli ultimi film, serie TV e anime in qualità HD', trending: 'Tendenze', popular: 'Popolare', newReleases: 'Nuove Uscite', continueWatching: 'Continua a Guardare', recommended: 'Consigliato per Te' },
            actions: { play: 'Riproduci', watchNow: 'Guarda Ora', addToWatchlist: 'Aggiungi alla Lista', removeFromWatchlist: 'Rimuovi dalla Lista', share: 'Condividi', download: 'Scarica', like: 'Mi Piace', dislike: 'Non Mi Piace', subscribe: 'Iscriviti', cancel: 'Annulla', save: 'Salva', delete: 'Elimina', edit: 'Modifica', submit: 'Invia', loading: 'Caricamento...', error: 'Errore', success: 'Successo' },
            content: { seasons: 'Stagioni', episodes: 'Episodi', cast: 'Cast', reviews: 'Recensioni', related: 'Correlati', genre: 'Genere', duration: 'Durata', rating: 'Valutazione', releaseDate: 'Data di Uscita', director: 'Regista', noResults: 'Nessun risultato trovato' },
            profile: { level: 'Livello', xp: 'XP', streak: 'Serie', badges: 'Badge', achievements: 'Obiettivi', watchHistory: 'Cronologia', favorites: 'Preferiti', friends: 'Amici' },
            footer: { about: 'Chi Siamo', contact: 'Contatti', privacy: 'Privacy', terms: 'Termini di Servizio', copyright: '© 2026 StreamVault. Tutti i diritti riservati.', quickLinks: 'Link Veloci', categories: 'Categorie', support: 'Supporto', stayConnected: 'Resta Connesso', subscribe: 'Iscriviti' },
        },
    },
    ru: {
        translation: {
            nav: { home: 'Главная', movies: 'Фильмы', shows: 'Сериалы', anime: 'Аниме', search: 'Поиск', watchlist: 'Мой Список', profile: 'Профиль', settings: 'Настройки', logout: 'Выйти', login: 'Войти', signup: 'Регистрация' },
            home: { hero: 'Смотрите Фильмы и Сериалы Бесплатно', heroSubtitle: 'Стримьте последние фильмы, сериалы и аниме в HD качестве', trending: 'В Тренде', popular: 'Популярное', newReleases: 'Новинки', continueWatching: 'Продолжить Просмотр', recommended: 'Рекомендуем' },
            actions: { play: 'Воспроизвести', watchNow: 'Смотреть', addToWatchlist: 'В Список', removeFromWatchlist: 'Удалить из Списка', share: 'Поделиться', download: 'Скачать', like: 'Нравится', dislike: 'Не нравится', subscribe: 'Подписаться', cancel: 'Отмена', save: 'Сохранить', delete: 'Удалить', edit: 'Редактировать', submit: 'Отправить', loading: 'Загрузка...', error: 'Ошибка', success: 'Успешно' },
            content: { seasons: 'Сезоны', episodes: 'Эпизоды', cast: 'Актёры', reviews: 'Отзывы', related: 'Похожие', genre: 'Жанр', duration: 'Длительность', rating: 'Рейтинг', releaseDate: 'Дата Выхода', director: 'Режиссёр', noResults: 'Ничего не найдено' },
            profile: { level: 'Уровень', xp: 'Опыт', streak: 'Серия', badges: 'Значки', achievements: 'Достижения', watchHistory: 'История', favorites: 'Избранное', friends: 'Друзья' },
            footer: { about: 'О Нас', contact: 'Контакты', privacy: 'Конфиденциальность', terms: 'Условия', copyright: '© 2026 StreamVault. Все права защищены.', quickLinks: 'Быстрые Ссылки', categories: 'Категории', support: 'Поддержка', stayConnected: 'Оставайтесь на связи', subscribe: 'Подписаться' },
        },
    },
    ja: {
        translation: {
            nav: { home: 'ホーム', movies: '映画', shows: 'ドラマ', anime: 'アニメ', search: '検索', watchlist: 'マイリスト', profile: 'プロフィール', settings: '設定', logout: 'ログアウト', login: 'ログイン', signup: '新規登録' },
            home: { hero: '映画とドラマを無料で視聴', heroSubtitle: '最新の映画、ドラマ、アニメをHD画質でストリーミング', trending: 'トレンド', popular: '人気', newReleases: '新作', continueWatching: '視聴を続ける', recommended: 'おすすめ' },
            actions: { play: '再生', watchNow: '今すぐ見る', addToWatchlist: 'リストに追加', removeFromWatchlist: 'リストから削除', share: '共有', download: 'ダウンロード', like: 'いいね', dislike: 'よくない', subscribe: '登録', cancel: 'キャンセル', save: '保存', delete: '削除', edit: '編集', submit: '送信', loading: '読み込み中...', error: 'エラー', success: '成功' },
            content: { seasons: 'シーズン', episodes: 'エピソード', cast: 'キャスト', reviews: 'レビュー', related: '関連作品', genre: 'ジャンル', duration: '時間', rating: '評価', releaseDate: '公開日', director: '監督', noResults: '結果が見つかりません' },
            profile: { level: 'レベル', xp: 'XP', streak: '連続視聴', badges: 'バッジ', achievements: '実績', watchHistory: '視聴履歴', favorites: 'お気に入り', friends: '友達' },
            footer: { about: '概要', contact: 'お問い合わせ', privacy: 'プライバシーポリシー', terms: '利用規約', copyright: '© 2026 StreamVault. All rights reserved.', quickLinks: 'クイックリンク', categories: 'カテゴリー', support: 'サポート', stayConnected: 'つながりを保つ', subscribe: '登録する' },
        },
    },
    ko: {
        translation: {
            nav: { home: '홈', movies: '영화', shows: 'TV 프로그램', anime: '애니메이션', search: '검색', watchlist: '내 목록', profile: '프로필', settings: '설정', logout: '로그아웃', login: '로그인', signup: '회원가입' },
            home: { hero: '영화와 프로그램을 무료로 시청', heroSubtitle: '최신 영화, TV 프로그램, 애니메이션을 HD 화질로 스트리밍', trending: '트렌딩', popular: '인기', newReleases: '신작', continueWatching: '이어보기', recommended: '추천' },
            actions: { play: '재생', watchNow: '지금 보기', addToWatchlist: '목록에 추가', removeFromWatchlist: '목록에서 제거', share: '공유', download: '다운로드', like: '좋아요', dislike: '싫어요', subscribe: '구독', cancel: '취소', save: '저장', delete: '삭제', edit: '수정', submit: '제출', loading: '로딩 중...', error: '오류', success: '성공' },
            content: { seasons: '시즌', episodes: '에피소드', cast: '출연진', reviews: '리뷰', related: '관련 콘텐츠', genre: '장르', duration: '러닝타임', rating: '평점', releaseDate: '출시일', director: '감독', noResults: '결과 없음' },
            profile: { level: '레벨', xp: '경험치', streak: '연속 시청', badges: '배지', achievements: '업적', watchHistory: '시청 기록', favorites: '즐겨찾기', friends: '친구' },
            footer: { about: '소개', contact: '문의', privacy: '개인정보 처리방침', terms: '이용약관', copyright: '© 2026 StreamVault. All rights reserved.', quickLinks: '빠른 링크', categories: '카테고리', support: '지원', stayConnected: '연결 유지', subscribe: '구독하기' },
        },
    },
    zh: {
        translation: {
            nav: { home: '首页', movies: '电影', shows: '电视剧', anime: '动漫', search: '搜索', watchlist: '我的列表', profile: '个人资料', settings: '设置', logout: '登出', login: '登录', signup: '注册' },
            home: { hero: '免费观看电影和剧集', heroSubtitle: '以高清画质流媒体播放最新电影、电视剧和动漫', trending: '热门趋势', popular: '热门', newReleases: '新上线', continueWatching: '继续观看', recommended: '为你推荐' },
            actions: { play: '播放', watchNow: '立即观看', addToWatchlist: '添加到列表', removeFromWatchlist: '从列表移除', share: '分享', download: '下载', like: '喜欢', dislike: '不喜欢', subscribe: '订阅', cancel: '取消', save: '保存', delete: '删除', edit: '编辑', submit: '提交', loading: '加载中...', error: '错误', success: '成功' },
            content: { seasons: '季', episodes: '集', cast: '演员表', reviews: '评论', related: '相关内容', genre: '类型', duration: '时长', rating: '评分', releaseDate: '上映日期', director: '导演', noResults: '未找到结果' },
            profile: { level: '等级', xp: '经验值', streak: '连续观看', badges: '徽章', achievements: '成就', watchHistory: '观看历史', favorites: '收藏', friends: '朋友' },
            footer: { about: '关于我们', contact: '联系我们', privacy: '隐私政策', terms: '服务条款', copyright: '© 2026 StreamVault. 保留所有权利。', quickLinks: '快速链接', categories: '分类', support: '支持', stayConnected: '保持联系', subscribe: '订阅' },
        },
    },
    ar: {
        translation: {
            nav: { home: 'الرئيسية', movies: 'أفلام', shows: 'مسلسلات', anime: 'أنمي', search: 'بحث', watchlist: 'قائمتي', profile: 'الملف الشخصي', settings: 'الإعدادات', logout: 'تسجيل الخروج', login: 'تسجيل الدخول', signup: 'إنشاء حساب' },
            home: { hero: 'شاهد الأفلام والمسلسلات مجاناً', heroSubtitle: 'بث أحدث الأفلام والمسلسلات والأنمي بجودة عالية', trending: 'الرائج', popular: 'الشائع', newReleases: 'إصدارات جديدة', continueWatching: 'متابعة المشاهدة', recommended: 'مقترح لك' },
            actions: { play: 'تشغيل', watchNow: 'شاهد الآن', addToWatchlist: 'أضف للقائمة', removeFromWatchlist: 'إزالة من القائمة', share: 'مشاركة', download: 'تحميل', like: 'إعجاب', dislike: 'عدم إعجاب', subscribe: 'اشتراك', cancel: 'إلغاء', save: 'حفظ', delete: 'حذف', edit: 'تعديل', submit: 'إرسال', loading: 'جاري التحميل...', error: 'خطأ', success: 'نجاح' },
            content: { seasons: 'مواسم', episodes: 'حلقات', cast: 'الممثلون', reviews: 'المراجعات', related: 'ذات صلة', genre: 'النوع', duration: 'المدة', rating: 'التقييم', releaseDate: 'تاريخ الإصدار', director: 'المخرج', noResults: 'لا توجد نتائج' },
            profile: { level: 'المستوى', xp: 'النقاط', streak: 'سلسلة المشاهدة', badges: 'الشارات', achievements: 'الإنجازات', watchHistory: 'سجل المشاهدة', favorites: 'المفضلة', friends: 'الأصدقاء' },
            footer: { about: 'من نحن', contact: 'اتصل بنا', privacy: 'سياسة الخصوصية', terms: 'شروط الخدمة', copyright: '© 2026 StreamVault. جميع الحقوق محفوظة.', quickLinks: 'روابط سريعة', categories: 'الخئات', support: 'دعم', stayConnected: 'بشكل متصل', subscribe: 'اشتراك' },
        },
    },
    tr: {
        translation: {
            nav: { home: 'Ana Sayfa', movies: 'Filmler', shows: 'Diziler', anime: 'Anime', search: 'Ara', watchlist: 'Listem', profile: 'Profil', settings: 'Ayarlar', logout: 'Çıkış Yap', login: 'Giriş Yap', signup: 'Kayıt Ol' },
            home: { hero: 'Film ve Dizileri Ücretsiz İzle', heroSubtitle: 'En son filmleri, dizileri ve animeleri HD kalitede izleyin', trending: 'Trend', popular: 'Popüler', newReleases: 'Yeni Çıkanlar', continueWatching: 'İzlemeye Devam Et', recommended: 'Sizin İçin Önerilen' },
            actions: { play: 'Oynat', watchNow: 'Şimdi İzle', addToWatchlist: 'Listeye Ekle', removeFromWatchlist: 'Listeden Çıkar', share: 'Paylaş', download: 'İndir', like: 'Beğen', dislike: 'Beğenme', subscribe: 'Abone Ol', cancel: 'İptal', save: 'Kaydet', delete: 'Sil', edit: 'Düzenle', submit: 'Gönder', loading: 'Yükleniyor...', error: 'Hata', success: 'Başarılı' },
            content: { seasons: 'Sezonlar', episodes: 'Bölümler', cast: 'Oyuncular', reviews: 'Yorumlar', related: 'Benzerler', genre: 'Tür', duration: 'Süre', rating: 'Puan', releaseDate: 'Yayın Tarihi', director: 'Yönetmen', noResults: 'Sonuç bulunamadı' },
            profile: { level: 'Seviye', xp: 'XP', streak: 'Seri', badges: 'Rozetler', achievements: 'Başarılar', watchHistory: 'Geçmiş', favorites: 'Favoriler', friends: 'Arkadaşlar' },
            footer: { about: 'Hakkımızda', contact: 'İletişim', privacy: 'Gizlilik Politikası', terms: 'Kullanım Şartları', copyright: '© 2026 StreamVault. Tüm hakları saklıdır.', quickLinks: 'Hızlı Linkler', categories: 'Kategoriler', support: 'Destek', stayConnected: 'Bağlı Kalın', subscribe: 'Abone Ol' },
        },
    },
    id: {
        translation: {
            nav: { home: 'Beranda', movies: 'Film', shows: 'Serial', anime: 'Anime', search: 'Cari', watchlist: 'Daftar Saya', profile: 'Profil', settings: 'Pengaturan', logout: 'Keluar', login: 'Masuk', signup: 'Daftar' },
            home: { hero: 'Tonton Film & Serial Gratis', heroSubtitle: 'Streaming film, serial, dan anime terbaru dalam kualitas HD', trending: 'Trending', popular: 'Populer', newReleases: 'Rilis Baru', continueWatching: 'Lanjutkan Menonton', recommended: 'Direkomendasikan' },
            actions: { play: 'Putar', watchNow: 'Tonton Sekarang', addToWatchlist: 'Tambah ke Daftar', removeFromWatchlist: 'Hapus dari Daftar', share: 'Bagikan', download: 'Unduh', like: 'Suka', dislike: 'Tidak Suka', subscribe: 'Berlangganan', cancel: 'Batal', save: 'Simpan', delete: 'Hapus', edit: 'Edit', submit: 'Kirim', loading: 'Memuat...', error: 'Error', success: 'Berhasil' },
            content: { seasons: 'Musim', episodes: 'Episode', cast: 'Pemeran', reviews: 'Ulasan', related: 'Terkait', genre: 'Genre', duration: 'Durasi', rating: 'Rating', releaseDate: 'Tanggal Rilis', director: 'Sutradara', noResults: 'Tidak ada hasil' },
            profile: { level: 'Level', xp: 'XP', streak: 'Streak', badges: 'Lencana', achievements: 'Pencapaian', watchHistory: 'Riwayat', favorites: 'Favorit', friends: 'Teman' },
            footer: { about: 'Tentang', contact: 'Kontak', privacy: 'Kebijakan Privasi', terms: 'Ketentuan Layanan', copyright: '© 2026 StreamVault. Semua hak dilindungi.', quickLinks: 'Tautan Cepat', categories: 'Kategori', support: 'Dukungan', stayConnected: 'Tetap Terhubung', subscribe: 'Berlangganan' },
        },
    },
    th: {
        translation: {
            nav: { home: 'หน้าแรก', movies: 'ภาพยนตร์', shows: 'ซีรีส์', anime: 'อนิเมะ', search: 'ค้นหา', watchlist: 'รายการของฉัน', profile: 'โปรไฟล์', settings: 'ตั้งค่า', logout: 'ออกจากระบบ', login: 'เข้าสู่ระบบ', signup: 'สมัครสมาชิก' },
            home: { hero: 'ดูหนังและซีรีส์ฟรี', heroSubtitle: 'สตรีมหนัง ซีรีส์ และอนิเมะล่าสุดในคุณภาพ HD', trending: 'มาแรง', popular: 'ยอดนิยม', newReleases: 'ใหม่ล่าสุด', continueWatching: 'ดูต่อ', recommended: 'แนะนำสำหรับคุณ' },
            actions: { play: 'เล่น', watchNow: 'ดูเลย', addToWatchlist: 'เพิ่มลงรายการ', removeFromWatchlist: 'ลบออกจากรายการ', share: 'แชร์', download: 'ดาวน์โหลด', like: 'ชอบ', dislike: 'ไม่ชอบ', subscribe: 'สมัครสมาชิก', cancel: 'ยกเลิก', save: 'บันทึก', delete: 'ลบ', edit: 'แก้ไข', submit: 'ส่ง', loading: 'กำลังโหลด...', error: 'ข้อผิดพลาด', success: 'สำเร็จ' },
            content: { seasons: 'ซีซัน', episodes: 'ตอน', cast: 'นักแสดง', reviews: 'รีวิว', related: 'ที่เกี่ยวข้อง', genre: 'ประเภท', duration: 'ความยาว', rating: 'คะแนน', releaseDate: 'วันที่ฉาย', director: 'ผู้กำกับ', noResults: 'ไม่พบผลลัพธ์' },
            profile: { level: 'เลเวล', xp: 'XP', streak: 'สตรีค', badges: 'ตรา', achievements: 'ความสำเร็จ', watchHistory: 'ประวัติการดู', favorites: 'รายการโปรด', friends: 'เพื่อน' },
            footer: { about: 'เกี่ยวกับ', contact: 'ติดต่อ', privacy: 'นโยบายความเป็นส่วนตัว', terms: 'เงื่อนไขการใช้งาน', copyright: '© 2026 StreamVault. สงวนลิขสิทธิ์.', quickLinks: 'ลิงค์ด่วน', categories: 'หมวดหมู่', support: 'สนับสนุน', stayConnected: 'เชื่อมต่อ', subscribe: 'สมัครสมาชิก' },
        },
    },
    vi: {
        translation: {
            nav: { home: 'Trang Chủ', movies: 'Phim', shows: 'Phim Bộ', anime: 'Anime', search: 'Tìm Kiếm', watchlist: 'Danh Sách', profile: 'Hồ Sơ', settings: 'Cài Đặt', logout: 'Đăng Xuất', login: 'Đăng Nhập', signup: 'Đăng Ký' },
            home: { hero: 'Xem Phim Miễn Phí', heroSubtitle: 'Phát trực tuyến phim, phim bộ và anime mới nhất với chất lượng HD', trending: 'Xu Hướng', popular: 'Phổ Biến', newReleases: 'Mới Ra Mắt', continueWatching: 'Tiếp Tục Xem', recommended: 'Đề Xuất Cho Bạn' },
            actions: { play: 'Phát', watchNow: 'Xem Ngay', addToWatchlist: 'Thêm Vào Danh Sách', removeFromWatchlist: 'Xóa Khỏi Danh Sách', share: 'Chia Sẻ', download: 'Tải Về', like: 'Thích', dislike: 'Không Thích', subscribe: 'Đăng Ký', cancel: 'Hủy', save: 'Lưu', delete: 'Xóa', edit: 'Chỉnh Sửa', submit: 'Gửi', loading: 'Đang Tải...', error: 'Lỗi', success: 'Thành Công' },
            content: { seasons: 'Mùa', episodes: 'Tập', cast: 'Diễn Viên', reviews: 'Đánh Giá', related: 'Liên Quan', genre: 'Thể Loại', duration: 'Thời Lượng', rating: 'Xếp Hạng', releaseDate: 'Ngày Phát Hành', director: 'Đạo Diễn', noResults: 'Không Tìm Thấy Kết Quả' },
            profile: { level: 'Cấp Độ', xp: 'Điểm', streak: 'Chuỗi', badges: 'Huy Hiệu', achievements: 'Thành Tựu', watchHistory: 'Lịch Sử Xem', favorites: 'Yêu Thích', friends: 'Bạn Bè' },
            footer: { about: 'Giới Thiệu', contact: 'Liên Hệ', privacy: 'Chính Sách Bảo Mật', terms: 'Điều Khoản Dịch Vụ', copyright: '© 2026 StreamVault. Bảo lưu mọi quyền.', quickLinks: 'Liên Kết Nhanh', categories: 'Danh Mục', support: 'Hỗ Trợ', stayConnected: 'Kết Nối', subscribe: 'Đăng Ký' },
        },
    },
    nl: {
        translation: {
            nav: { home: 'Home', movies: 'Films', shows: 'Series', anime: 'Anime', search: 'Zoeken', watchlist: 'Mijn Lijst', profile: 'Profiel', settings: 'Instellingen', logout: 'Uitloggen', login: 'Inloggen', signup: 'Registreren' },
            home: { hero: 'Gratis Films en Series Kijken', heroSubtitle: 'Stream de nieuwste films, series en anime in HD-kwaliteit', trending: 'Trending', popular: 'Populair', newReleases: 'Nieuw', continueWatching: 'Verder Kijken', recommended: 'Aanbevolen' },
            actions: { play: 'Afspelen', watchNow: 'Nu Kijken', addToWatchlist: 'Toevoegen aan Lijst', removeFromWatchlist: 'Verwijderen uit Lijst', share: 'Delen', download: 'Downloaden', like: 'Vind ik leuk', dislike: 'Niet leuk', subscribe: 'Abonneren', cancel: 'Annuleren', save: 'Opslaan', delete: 'Verwijderen', edit: 'Bewerken', submit: 'Verzenden', loading: 'Laden...', error: 'Fout', success: 'Gelukt' },
            content: { seasons: 'Seizoenen', episodes: 'Afleveringen', cast: 'Cast', reviews: 'Reviews', related: 'Gerelateerd', genre: 'Genre', duration: 'Duur', rating: 'Beoordeling', releaseDate: 'Releasedatum', director: 'Regisseur', noResults: 'Geen resultaten gevonden' },
            profile: { level: 'Level', xp: 'XP', streak: 'Streak', badges: 'Badges', achievements: 'Prestaties', watchHistory: 'Geschiedenis', favorites: 'Favorieten', friends: 'Vrienden' },
            footer: { about: 'Over Ons', contact: 'Contact', privacy: 'Privacy', terms: 'Voorwaarden', copyright: '© 2026 StreamVault. Alle rechten voorbehouden.', quickLinks: 'Snelle Links', categories: 'Categorieën', support: 'Ondersteuning', stayConnected: 'Blijf Verbonden', subscribe: 'Abonneren' },
        },
    },
    pl: {
        translation: {
            nav: { home: 'Strona Główna', movies: 'Filmy', shows: 'Seriale', anime: 'Anime', search: 'Szukaj', watchlist: 'Moja Lista', profile: 'Profil', settings: 'Ustawienia', logout: 'Wyloguj', login: 'Zaloguj', signup: 'Zarejestruj' },
            home: { hero: 'Oglądaj Filmy i Seriale Za Darmo', heroSubtitle: 'Streamuj najnowsze filmy, seriale i anime w jakości HD', trending: 'Popularne', popular: 'Najpopularniejsze', newReleases: 'Nowości', continueWatching: 'Kontynuuj Oglądanie', recommended: 'Polecane' },
            actions: { play: 'Odtwórz', watchNow: 'Oglądaj Teraz', addToWatchlist: 'Dodaj do Listy', removeFromWatchlist: 'Usuń z Listy', share: 'Udostępnij', download: 'Pobierz', like: 'Lubię', dislike: 'Nie lubię', subscribe: 'Subskrybuj', cancel: 'Anuluj', save: 'Zapisz', delete: 'Usuń', edit: 'Edytuj', submit: 'Wyślij', loading: 'Ładowanie...', error: 'Błąd', success: 'Sukces' },
            content: { seasons: 'Sezony', episodes: 'Odcinki', cast: 'Obsada', reviews: 'Recenzje', related: 'Podobne', genre: 'Gatunek', duration: 'Czas Trwania', rating: 'Ocena', releaseDate: 'Data Premiery', director: 'Reżyser', noResults: 'Brak wyników' },
            profile: { level: 'Poziom', xp: 'XP', streak: 'Seria', badges: 'Odznaki', achievements: 'Osiągnięcia', watchHistory: 'Historia', favorites: 'Ulubione', friends: 'Przyjaciele' },
            footer: { about: 'O Nas', contact: 'Kontakt', privacy: 'Polityka Prywatności', terms: 'Regulamin', copyright: '© 2026 StreamVault. Wszelkie prawa zastrzeżone.', quickLinks: 'Szybkie Linki', categories: 'Kategorie', support: 'Wsparcie', stayConnected: 'Bądź w Kontakcie', subscribe: 'Subskrybuj' },
        },
    },
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false,
        },
        detection: {
            order: ['localStorage', 'navigator', 'htmlTag'],
            caches: ['localStorage'],
        },
    });

export default i18n;
