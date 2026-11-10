const express = require('express');
const app = express();
const port = 3000;

app.use(express.json());

// ===== Логирование всех запросов =====
app.use((req, res, next) => {
  console.log(
    `[${new Date().toISOString()}] ${req.method} ${req.url} — IP: ${req.ip}`
  );
  next();
});

// ===== Данные =====
let tasks = [
  { id: 1, title: 'Сделать лабораторную работу', priority: 'high',   deadline: '2025-02-10', done: false },
  { id: 2, title: 'Купить продукты',             priority: 'low',    deadline: '2025-02-05', done: true  },
  { id: 3, title: 'Позвонить клиенту',           priority: 'high',   deadline: '2025-02-07', done: false },
  { id: 4, title: 'Прочитать статью',            priority: 'medium', deadline: '2025-02-15', done: false },
  { id: 5, title: 'Записаться к врачу',          priority: 'medium', deadline: '2025-02-08', done: true  },
  { id: 6, title: 'Обновить резюме',             priority: 'low',    deadline: '2025-02-20', done: false },
  { id: 7, title: 'Подготовить отчёт',           priority: 'high',   deadline: '2025-02-12', done: false }
];

const allowedSortFields   = ['id', 'title', 'priority', 'deadline'];
const allowedFilterFields = ['done', 'priority'];

// ===== СРЕДНИЙ УРОВЕНЬ: /tasks с поиском, сортировкой, пагинацией, фильтрацией =====
app.get('/tasks', (req, res) => {
  let result = [...tasks];

  // --- Поиск по названию ---
  const search = req.query.search;
  if (search) {
    result = result.filter(t =>
      t.title.toLowerCase().includes(String(search).toLowerCase())
    );
  }

  // --- Фильтрация по полю: ---
  const filter = req.query.filter;
  if (filter) {
    const [field, value] = String(filter).split(':');

    if (!field || value === undefined) {
      return res.status(400).json({
        error: 'Параметр filter должен быть в формате field:value'
      });
    }
    if (!allowedFilterFields.includes(field)) {
      return res.status(400).json({
        error: `Фильтрация возможна только по полям: ${allowedFilterFields.join(', ')}`
      });
    }

    if (field === 'done') {
      // приём значений true/false/1/0
      const boolVal = ['true', '1'].includes(value.toLowerCase())
        ? true
        : ['false', '0'].includes(value.toLowerCase())
          ? false
          : null;
      if (boolVal === null) {
        return res.status(400).json({
          error: 'Значение для done должно быть true или false'
        });
      }
      result = result.filter(t => t.done === boolVal);
    } else {
      result = result.filter(
        t => String(t[field]).toLowerCase() === value.toLowerCase()
      );
    }
  }

  // --- Сортировка ---
  const sort  = req.query.sort;
  const order = (req.query.order || 'asc').toLowerCase();

  if (sort) {
    if (!allowedSortFields.includes(sort)) {
      return res.status(400).json({
        error: `Поле сортировки должно быть одним из: ${allowedSortFields.join(', ')}`
      });
    }
    if (!['asc', 'desc'].includes(order)) {
      return res.status(400).json({
        error: 'Параметр order должен быть asc или desc'
      });
    }
    result.sort((a, b) => {
      let cmp;
      if (sort === 'deadline') {
        cmp = new Date(a[sort]) - new Date(b[sort]);
      } else if (typeof a[sort] === 'number') {
        cmp = a[sort] - b[sort];
      } else {
        cmp = String(a[sort]).localeCompare(String(b[sort]));
      }
      return order === 'desc' ? -cmp : cmp;
    });
  }

  // --- Пагинация ---
  const page  = parseInt(req.query.page)  || 1;
  const limit = parseInt(req.query.limit) || 10;

  if (page < 1) {
    return res.status(400).json({ error: 'page должен быть >= 1' });
  }
  if (limit < 1 || limit > 100) {
    return res.status(400).json({ error: 'limit должен быть от 1 до 100' });
  }

  const start     = (page - 1) * limit;
  const paginated = result.slice(start, start + limit);

  res.json({
    count: result.length,
    page,
    limit,
    totalPages: Math.ceil(result.length / limit) || 0,
    items: paginated
  });
});

// ===== Базовые эндпоинты (для совместимости) =====
app.get('/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'ID должен быть числом' });
  }
  const task = tasks.find(t => t.id === id);
  if (!task) {
    return res.status(404).json({ error: 'Задача не найдена' });
  }
  res.json(task);
});

// ===== Обработка 404  =====
app.use((req, res) => {
  res.status(404).json({ error: 'Маршрут не найден' });
});

app.listen(port, () => {
  console.log(`Сервер запущен на http://localhost:${port}`);
});