require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const { getUserById, 
    setUserMenuLevel, 
    getStaff, 
    getStaffList, 
    addUser, 
    createLog, 
    getOperation, 
    getOperations, 
    getActiveOperation, 
    updateLogFinishTime, 
    setUserStaffId, 
    setUserOperationId, 
    getOperationById, 
    setUserComment,
    getFormattedLogs,
    getOpenOperationsByUser,
   } = require('./service.js');

    const { exportReportToExcel } = require('./exporter.js'); // Импортируем функцию экспорта


const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

function getButtonOptions(buttons) {

    return {
        reply_markup: {
          keyboard: buttons,
          resize_keyboard: true,
          one_time_keyboard: true
        }
    }
}

// Обработчик команды /start
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userName = msg.from.username; // Имя пользователя в Telegram
  const user = await getUserById(chatId);

  // Если пользователя нет в базе, добавляем его
  if (!user) {
    await addUser(chatId, userName);
    await setUserMenuLevel(chatId, 1); // Устанавливаем начальный уровень меню
    bot.sendMessage(chatId, "Добро пожаловать! Пожалуйста, выберите сотрудника.", getButtonOptions([["Выбор сотрудника"],["Открытые операции"],["Экспорт отчета"]]));
  } else {
    // Если пользователь уже существует
    await setUserMenuLevel(chatId, 1);
    bot.sendMessage(chatId, "Вы уже зарегистрированы. Пожалуйста, выберите сотрудника.", getButtonOptions([["Выбор сотрудника"],["Открытые операции"],["Экспорт отчета"]]));
  }
});

// Обработчик всех текстовых сообщений
bot.on('message', async (msg) => {
    console.log({chatId:msg.chat.id, text:msg.text});
  const chatId = msg.chat.id;
  const user = await getUserById(chatId);
  if (!user) {
    return bot.sendMessage(chatId, "Вы не зарегистрированы. Пожалуйста, начните с команды /start.");
  }
  if(!user.fio){
    return bot.sendMessage(chatId, `Вы не зарегистрированы. Пожалуйста, обратитесь к руководителю и сообщите свое ФИО и этот id - ${chatId}`);
  }

  const userMenuLevel = user.menu_level;

  console.log({userMenuLevel});

  switch (userMenuLevel) {
    case 1:
      if (msg.text === 'Выбор сотрудника') {
        await setUserMenuLevel(chatId, 2);

        bot.sendMessage(chatId, "Введите имя сотрудника или symbol");
      } else if (msg.text === 'Экспорт отчета') {
        const data = await getFormattedLogs();
        // Генерируем и отправляем Excel файл
        await exportReportToExcel(data, chatId, bot);
      } else if (msg.text === 'Открытые операции') {
        const data = await getOpenOperationsByUser(chatId);
        if(data.length > 0){
          bot.sendMessage(chatId, `У вас ${data.length} открытых операций.`);
          for (const row of data) {
            bot.sendMessage(chatId, `(${row.login})- ${row.name} - ${row.operation_name} - ${Date(row.start_at).toString()}`);
          }
        }else{
          bot.sendMessage(chatId, "У вас нет открытых операций.");
        }
      }
      break;
    case 2:
        const staffName = msg.text;

        const staffList = await getStaffList(staffName);
        const buttons = staffList.map(staff => [{ text: staff.name + ' (' + staff.login + ')' }]);
        buttons.push(["Ввести сотрудника заново"])

        console.log(buttons);
        
        if (buttons.length === 1) {
            bot.sendMessage(chatId, "Не найден сотрудник с таким именем. Пожалуйста, повторите ввод.");
        }else{
            await setUserMenuLevel(chatId, 3);
            bot.sendMessage(chatId, "Выберите сотрудника:", getButtonOptions(buttons));
        }
        break;
    case 3:
      if (msg.text === 'Ввести сотрудника заново') {
        await setUserMenuLevel(chatId, 2);
        bot.sendMessage(chatId, "Введите имя сотрудника или symbol");
        break;
      }
      //get staff login
      if (msg.text.split('(')[1] === undefined) {
        await setUserMenuLevel(chatId, 2);
        bot.sendMessage(chatId, "Не найден сотрудник с таким именем. Пожалуйста, повторите ввод.");
        break;
      }
      const login = msg.text.split('(')[1].split(')')[0];
      console.log(login);
      const staff = await getStaff(login);
      if (staff) {
        await setUserStaffId(chatId, staff.id);
        const activeOp = await getActiveOperation(staff.id);

        if (activeOp) {
            await setUserMenuLevel(chatId, 5);
          // Если у сотрудника есть незавершенная операция
          const buttons = [
            [{ text: 'Завершить с текущим временем' }],
            [{ text: 'Завершить с указанием времени' }]
          ];

          console.log({activeOp});
          const operation = await getOperationById(activeOp.operations_id);
          console.log({operation});
          bot.sendMessage(chatId, `Операция: ${operation?.name}`, {
            reply_markup: {
              keyboard: buttons,
              resize_keyboard: true,
              one_time_keyboard: true
            }
          });
        } else {
            await setUserMenuLevel(chatId, 4);
          // Если операции нет, выбираем новую
          const operations = await getOperations();
          const buttons = operations.map(op => [{ text: op.name }]);

          bot.sendMessage(chatId, "Выберите операцию:", {
            reply_markup: {
              keyboard: buttons,
              resize_keyboard: true,
              one_time_keyboard: true
            }
          });
        }
      } else {
        bot.sendMessage(chatId, "Не найден сотрудник с таким именем. Пожалуйста, выберите снова.");
      }
        
      break;
    case 4:
      const operation = msg.text;  
      const op = await getOperation(operation);
      if (op) {
        if(op.name === "Другое"){
            await setUserMenuLevel(chatId, 41);
            await setUserOperationId(chatId, op.id);
            bot.sendMessage(chatId, "Введите коментарий", getButtonOptions());
            break;
        }
        await setUserOperationId(chatId, op.id);
        await setUserMenuLevel(chatId, 6);
        bot.sendMessage(chatId, "Укажите дату и время начала операции", getButtonOptions([["Текущее время"],["Выбор даты и времени"]]));
        break;
      }
      bot.sendMessage(chatId, "Не найдена операция с таким именем. Пожалуйста, выберите снова.");
      break;
    case 41:
        const comment = msg.text;
        await setUserComment(chatId, comment);
        await setUserMenuLevel(chatId, 6);
        bot.sendMessage(chatId, "Укажите дату и время начала операции", getButtonOptions([["Текущее время"],["Выбор даты и времени"]]));
        break;
    case 5:
      if (msg.text === 'Завершить с текущим временем') {
        await finishOperationWithCurrentTime(chatId, user.staff_id);
      } else if (msg.text === 'Завершить с указанием времени') {
        await promptForDateTime(chatId, true);
      }
      break;
    case 6:
        if (msg.text === 'Текущее время') {
            await startOperationWithCurrentTime(chatId, user.staff_id, user.operation_id, user.comment);
        } else if (msg.text === 'Выбор даты и времени') {
            await promptForDateTime(chatId, false);
        }
        break;

    default:
      bot.sendMessage(chatId, "Неизвестный уровень меню. Пожалуйста, начните с /start.");
  }
});

const startOperationWithCurrentTime = async (chatId, staffId, operationId, comment) => {
  const startTime = new Date();
  await createLog(chatId, staffId, operationId, comment, startTime);

  await setUserMenuLevel(chatId, 1);
  await setUserStaffId(chatId, null);
  await setUserOperationId(chatId, null);
  await setUserComment(chatId, null);

  bot.sendMessage(chatId, "Операция начата.", getButtonOptions([["Выбор сотрудника"],["Открытые операции"],["Экспорт отчета"]]));
};

// Функция для завершения операции с текущим временем
const finishOperationWithCurrentTime = async (chatId, staffId) => {
  const activeOp = await getActiveOperation(staffId);
  let msg = "Нет активных операций для завершения."
  if (activeOp) {
    const finishTime = new Date();
    await updateLogFinishTime(activeOp.id, finishTime);
    msg = "Операция завершена.";
    
  } 
  
  await setUserMenuLevel(chatId, 1);
  await setUserStaffId(chatId, null);
  await setUserOperationId(chatId, null);

  bot.sendMessage(chatId, msg, getButtonOptions([["Выбор сотрудника"],["Открытые операции"],["Экспорт отчета"]]));
};

// Функция для запроса даты и времени через кнопки
const promptForDateTime = (chatId, isFinish = false) => {
  const today = new Date();
  const dateButtons = [
    [{ text: `Сегодня (${today.toLocaleDateString("ru-RU")})` }],
    [{ text: `Вчера (${new Date(today.setDate(today.getDate() - 1)).toLocaleDateString("ru-RU")})` }],
  ];
  const msg = isFinish ? "Выберите дату для завершения операции:" : "Выберите дату начала операции:";

  bot.sendMessage(chatId, msg, {
    reply_markup: {
      keyboard: dateButtons,
      resize_keyboard: true,
      one_time_keyboard: true
    }
  });

  bot.once('message', async (msg) => {
    let selectedDate = msg.text;
    if (msg.text.split('(')[1] !== undefined) {
        selectedDate = msg.text.split('(')[1].split(')')[0];
    }
    //const selectedDate = msg.text;
    const [day, month, year] = selectedDate.split('.');

    const selectedDateObj =  new Date(year, month - 1, day); 
    
    if (selectedDateObj.toString() !== 'Invalid Date') {
        promptForTime(chatId, selectedDateObj, isFinish);
    } else {
      bot.sendMessage(chatId, "Выберите корректную дату.");
      promptForDateTime(chatId, isFinish);
    }
  });
};

// Функция для запроса времени после выбора даты
const promptForTime = (chatId, selectedDate, isFinish) => {
  const timeButtons = [
    [{ text: '08:00' }, { text: '12:00' }],
    [{ text: '16:00' }, { text: '20:00' }]
  ];

  bot.sendMessage(chatId, "Выберите время:", {
    reply_markup: {
      keyboard: timeButtons,
      resize_keyboard: true,
      one_time_keyboard: true
    }
  });

  bot.once('message', async (msg) => {
    const selectedTime = msg.text;
    const [hours, minutes] = selectedTime.split(':');
    selectedDate.setHours(hours, minutes);
    if (isFinish) {
        await finishOperationWithTime(chatId, selectedDate);
    } else {
        await startOperationWithTime(chatId, selectedDate);
    }
  });
};

// Функция для завершения операции с заданным временем
const finishOperationWithTime = async (chatId, selectedDate) => {
  const user = await getUserById(chatId);
  const activeOp = await getActiveOperation(user.staff_id);
  let msg = "Нет активных операций для завершения."
  if (activeOp) {
    await updateLogFinishTime(activeOp.id, selectedDate);
    
    msg = `Операция завершена в ${selectedDate.toLocaleString("ru-RU")}`;
  } 
  await setUserMenuLevel(chatId, 1);
  await setUserStaffId(chatId, null);
  await setUserOperationId(chatId, null);
  bot.sendMessage(chatId, msg, getButtonOptions([["Выбор сотрудника"],["Открытые операции"],["Экспорт отчета"]]));
};

const startOperationWithTime = async (chatId, selectedDate) => {
  const user = await getUserById(chatId);
  console.log({user})
  await createLog(chatId, user.staff_id, user.operation_id, user.comment, selectedDate);

  await setUserMenuLevel(chatId, 1);
  await setUserStaffId(chatId, null);
  await setUserOperationId(chatId, null);
  await setUserComment(chatId, null);

  bot.sendMessage(chatId, `Операция начата ${selectedDate.toLocaleString("ru-RU")}.`, getButtonOptions([["Выбор сотрудника"],["Открытые операции"],["Экспорт отчета"]]));
};
