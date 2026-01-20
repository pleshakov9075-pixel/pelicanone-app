export const ru = {
  routes: {
    home: "Главная",
    generate: "Генерация",
    status: "Статус",
    history: "История",
    balance: "Баланс"
  },
  titles: {
    app: "PelicanOne 2.0",
    generation: "Генерация",
    result: "Результат",
    status: "Статус задачи",
    history: "История",
    balance: "Баланс"
  },
  actions: {
    generate: "Сгенерировать",
    history: "История",
    balance: "Баланс",
    topup: "Пополнить",
    copy: "Копировать",
    open: "Открыть",
    download: "Скачать",
    copyLink: "Копировать ссылку",
    logout: "Выйти",
    devLogin: "Войти (DEV)",
    json: "JSON",
    hideJson: "Скрыть JSON",
    showAdvanced: "Расширенные настройки",
    hideAdvanced: "Скрыть расширенные настройки",
    toHistory: "К истории",
    rawDebug: "Сырые данные"
  },
  labels: {
    chooseGeneration: "Выберите тип генерации:",
    preset: "Пресет",
    generationType: "Тип генерации",
    referenceSoon: "Референс (скоро)",
    lastJob: "Последняя задача",
    status: "Статус",
    id: "ID",
    waiting: "Ожидание",
    elapsed: "Прошло",
    remaining: "Осталось",
    externalLink: "Внешняя ссылка",
    devMode: "DEV режим"
  },
  messages: {
    loadingPresets: "Загрузка пресетов...",
    presetsLoadFailed: "Не удалось загрузить пресеты.",
    presetsMissing: "Пресеты не найдены",
    resultPending: "Результат появится после завершения генерации.",
    generating: "Генерация в процессе...",
    noJobs: "Нет задач",
    devModeDisabled:
      "DEV режим отключён. Установите VITE_DEV_AUTH=true для тестирования.",
    devModeHint: "Веб режим: используйте DEV авторизацию для тестирования.",
    authRequired:
      "Веб режим: требуется JWT от backend. Запустите приложение через Telegram/VK.",
    authFailed: "Авторизация не удалась. Проверьте доступность backend.",
    authorizing: "Авторизация...",
    jobNotFound: "Задача не найдена",
    jobTimeout: "Задача выполняется слишком долго. Обновите статус или попробуйте позже.",
    topupStub: "Платежи пока не подключены. Сейчас мок."
  },
  errors: {
    generationFailed: "Ошибка генерации",
    requestFailed: "Не удалось выполнить запрос",
    copyFailed: "Не удалось скопировать",
    copySuccess: "Скопировано!"
  },
  statuses: {
    queued: "В очереди",
    running: "Выполняется",
    finished: "Готово",
    done: "Готово",
    failed: "Ошибка",
    canceled: "Отменено",
    unknown: "Неизвестно"
  },
  jobTypes: {
    text: "Текст",
    image: "Изображение",
    video: "Видео",
    audio: "Аудио"
  }
};

export function formatStatus(status?: string | null) {
  if (!status) {
    return "";
  }
  return ru.statuses[status as keyof typeof ru.statuses] ?? status;
}

export function formatSeconds(seconds: number) {
  return `${Math.max(0, Math.floor(seconds))} сек`;
}

export function formatJobType(jobType?: string | null) {
  if (!jobType) {
    return "";
  }
  return ru.jobTypes[jobType as keyof typeof ru.jobTypes] ?? jobType;
}
