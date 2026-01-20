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
    jobDetails: "Статус и результат",
    request: "Запрос",
    history: "История",
    balance: "Баланс"
  },
  actions: {
    generate: "Сгенерировать",
    history: "История",
    balance: "Баланс",
    topup: "Пополнить",
    copy: "Копировать",
    copyJson: "Скопировать JSON",
    open: "Открыть",
    download: "Скачать",
    copyLink: "Копировать ссылку",
    logout: "Выйти",
    json: "JSON",
    hideJson: "Скрыть JSON",
    requestTab: "Запрос",
    jsonRequestTab: "JSON запрос",
    resultTab: "Результат",
    jsonResultTab: "JSON ответ",
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
    model: "Модель",
    parameters: "Параметры",
    externalLink: "Внешняя ссылка",
    price: "Цена"
  },
  messages: {
    loadingPresets: "Загрузка пресетов...",
    presetsLoadFailed: "Не удалось загрузить пресеты.",
    presetsMissing: "Пресеты не найдены",
    resultPending: "Результат появится после завершения генерации.",
    generating: "Генерация в процессе...",
    noJobs: "Нет задач",
    authorizing: "Авторизация...",
    jobNotFound: "Задача не найдена",
    jobTimeout: "Задача выполняется слишком долго. Обновите статус или попробуйте позже.",
    telegramInitDataMissing: "Откройте мини-приложение в Telegram.",
    topupStub: "Платежи пока не подключены. Сейчас мок."
  },
  errors: {
    generationFailed: "Ошибка генерации",
    insufficientFunds: "Недостаточно средств на балансе.",
    requestFailed: "Не удалось выполнить запрос",
    copyFailed: "Не удалось скопировать",
    copySuccess: "Скопировано!"
  },
  statuses: {
    queued: "В очереди",
    processing: "Генерируется",
    done: "Готово",
    error: "Ошибка",
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
