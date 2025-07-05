-- =====================================================
-- Схема базы данных для Telegram Bot Shift Supervisor
-- =====================================================

-- Удаляем существующие таблицы (если есть)
DROP TABLE IF EXISTS logs;
DROP TABLE IF EXISTS operations;
DROP TABLE IF EXISTS staff;
DROP TABLE IF EXISTS users;

-- =====================================================
-- Таблица пользователей бота
-- =====================================================
CREATE TABLE users (
    id BIGINT PRIMARY KEY COMMENT 'Telegram Chat ID',
    name VARCHAR(100) NOT NULL COMMENT 'Telegram Username',
    fio VARCHAR(200) NULL COMMENT 'ФИО сотрудника (назначается администратором)',
    menu_level INT NOT NULL DEFAULT 1 COMMENT 'Текущий уровень в меню бота',
    staff_id INT NULL COMMENT 'ID выбранного сотрудника',
    operation_id INT NULL COMMENT 'ID выбранной операции',
    comment TEXT NULL COMMENT 'Комментарий к операции',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_menu_level (menu_level),
    INDEX idx_staff_id (staff_id),
    INDEX idx_operation_id (operation_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Пользователи Telegram бота';

-- =====================================================
-- Таблица сотрудников
-- =====================================================
CREATE TABLE staff (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL COMMENT 'Имя сотрудника',
    login VARCHAR(50) NOT NULL UNIQUE COMMENT 'Логин/символ сотрудника',
    is_active BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Активен ли сотрудник',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_name (name),
    INDEX idx_login (login),
    INDEX idx_is_active (is_active),
    FULLTEXT KEY ft_search (name, login) COMMENT 'Полнотекстовый поиск по имени и логину'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Сотрудники компании';

-- =====================================================
-- Таблица типов операций
-- =====================================================
CREATE TABLE operations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL UNIQUE COMMENT 'Название операции',
    description TEXT NULL COMMENT 'Описание операции',
    requires_comment BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Требует ли операция комментарий',
    is_active BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Активна ли операция',
    sort_order INT NOT NULL DEFAULT 0 COMMENT 'Порядок сортировки в списке',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_name (name),
    INDEX idx_is_active (is_active),
    INDEX idx_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Типы операций/работ';

-- =====================================================
-- Таблица журнала операций
-- =====================================================
CREATE TABLE logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    users_id BIGINT NOT NULL COMMENT 'ID пользователя, который зафиксировал операцию',
    staff_id INT NOT NULL COMMENT 'ID сотрудника, выполняющего операцию',
    operations_id INT NOT NULL COMMENT 'ID типа операции',
    comment TEXT NULL COMMENT 'Комментарий к операции',
    start_at DATETIME NOT NULL COMMENT 'Время начала операции',
    finish_at DATETIME NULL COMMENT 'Время завершения операции',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Время создания записи',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Время последнего обновления',
    
    -- Индексы для быстрого поиска
    INDEX idx_users_id (users_id),
    INDEX idx_staff_id (staff_id),
    INDEX idx_operations_id (operations_id),
    INDEX idx_start_at (start_at),
    INDEX idx_finish_at (finish_at),
    INDEX idx_created_at (created_at),
    
    -- Индекс для поиска активных операций
    INDEX idx_active_operations (staff_id, finish_at),
    
    -- Индекс для отчетов
    INDEX idx_reports (start_at, finish_at, staff_id, operations_id),
    
    -- Внешние ключи
    CONSTRAINT fk_logs_users 
        FOREIGN KEY (users_id) REFERENCES users(id) 
        ON DELETE RESTRICT ON UPDATE CASCADE,
        
    CONSTRAINT fk_logs_staff 
        FOREIGN KEY (staff_id) REFERENCES staff(id) 
        ON DELETE RESTRICT ON UPDATE CASCADE,
        
    CONSTRAINT fk_logs_operations 
        FOREIGN KEY (operations_id) REFERENCES operations(id) 
        ON DELETE RESTRICT ON UPDATE CASCADE,
        
    -- Проверочные ограничения
    CONSTRAINT chk_finish_after_start 
        CHECK (finish_at IS NULL OR finish_at >= start_at)
        
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Журнал операций сотрудников';

-- =====================================================
-- Внешние ключи для таблицы users (добавляем после создания всех таблиц)
-- =====================================================
ALTER TABLE users 
ADD CONSTRAINT fk_users_staff 
    FOREIGN KEY (staff_id) REFERENCES staff(id) 
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE users 
ADD CONSTRAINT fk_users_operations 
    FOREIGN KEY (operation_id) REFERENCES operations(id) 
    ON DELETE SET NULL ON UPDATE CASCADE;

-- =====================================================
-- Начальные данные для операций
-- =====================================================
INSERT INTO operations (name, description, requires_comment, sort_order) VALUES
('Прием смены', 'Принятие смены от предыдущего сотрудника', FALSE, 1),
('Сдача смены', 'Передача смены следующему сотруднику', FALSE, 2),
('Обход территории', 'Плановый обход охраняемой территории', FALSE, 3),
('Проверка документов', 'Контроль пропускного режима', FALSE, 4),
('Инструктаж', 'Проведение инструктажа с персоналом', FALSE, 5),
('Техническое обслуживание', 'Обслуживание оборудования', FALSE, 6),
('Работа с посетителями', 'Консультации и помощь посетителям', FALSE, 7),
('Уборка', 'Уборка рабочего места', FALSE, 8),
('Обучение', 'Обучение и повышение квалификации', FALSE, 9),
('Другое', 'Прочие операции', TRUE, 99);

-- =====================================================
-- Примеры сотрудников (можно удалить в production)
-- =====================================================
INSERT INTO staff (name, login) VALUES
('Иванов Иван Иванович', 'ivanov'),
('Петров Петр Петрович', 'petrov'),
('Сидоров Сидор Сидорович', 'sidorov'),
('Козлова Анна Александровна', 'kozlova'),
('Морозов Дмитрий Владимирович', 'morozov');

-- =====================================================
-- Представления (Views) для удобства работы
-- =====================================================

-- Представление для отчетов с читаемыми именами
CREATE VIEW v_logs_report AS
SELECT 
    l.id,
    u.fio as supervisor_fio,
    s.name as staff_name,
    s.login as staff_login,
    o.name as operation_name,
    l.comment,
    l.start_at,
    l.finish_at,
    CASE 
        WHEN l.finish_at IS NULL THEN NULL
        ELSE TIMESTAMPDIFF(MINUTE, l.start_at, l.finish_at)
    END as duration_minutes,
    CONVERT_TZ(l.created_at, '+00:00', '+03:00') AS created_at,
    CONVERT_TZ(l.updated_at, '+00:00', '+03:00') AS updated_at
FROM logs l
LEFT JOIN users u ON l.users_id = u.id
LEFT JOIN staff s ON l.staff_id = s.id
LEFT JOIN operations o ON l.operations_id = o.id
ORDER BY l.start_at DESC;

-- Представление для активных операций
CREATE VIEW v_active_operations AS
SELECT 
    l.id as log_id,
    s.id as staff_id,
    s.name as staff_name,
    s.login as staff_login,
    o.name as operation_name,
    l.start_at,
    TIMESTAMPDIFF(MINUTE, l.start_at, NOW()) as duration_minutes,
    u.fio as supervisor_fio
FROM logs l
JOIN staff s ON l.staff_id = s.id
JOIN operations o ON l.operations_id = o.id
LEFT JOIN users u ON l.users_id = u.id
WHERE l.finish_at IS NULL
ORDER BY l.start_at ASC;

-- =====================================================
-- Процедуры для частых операций
-- =====================================================

DELIMITER //

-- Процедура для начала операции
CREATE PROCEDURE StartOperation(
    IN p_user_id BIGINT,
    IN p_staff_id INT,
    IN p_operation_id INT,
    IN p_comment TEXT,
    IN p_start_time DATETIME
)
BEGIN
    DECLARE v_active_count INT DEFAULT 0;
    
    -- Проверяем, нет ли у сотрудника активных операций
    SELECT COUNT(*) INTO v_active_count
    FROM logs 
    WHERE staff_id = p_staff_id AND finish_at IS NULL;
    
    IF v_active_count > 0 THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'У сотрудника уже есть активная операция';
    END IF;
    
    -- Создаем новую запись
    INSERT INTO logs (users_id, staff_id, operations_id, comment, start_at)
    VALUES (p_user_id, p_staff_id, p_operation_id, p_comment, p_start_time);
    
    SELECT LAST_INSERT_ID() as log_id;
END //

-- Процедура для завершения операции
CREATE PROCEDURE FinishOperation(
    IN p_staff_id INT,
    IN p_finish_time DATETIME
)
BEGIN
    DECLARE v_log_id INT DEFAULT 0;
    
    -- Находим активную операцию
    SELECT id INTO v_log_id
    FROM logs 
    WHERE staff_id = p_staff_id AND finish_at IS NULL
    LIMIT 1;
    
    IF v_log_id = 0 THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'У сотрудника нет активных операций';
    END IF;
    
    -- Завершаем операцию
    UPDATE logs 
    SET finish_at = p_finish_time, updated_at = NOW()
    WHERE id = v_log_id;
    
    SELECT v_log_id as log_id, 'Operation finished successfully' as message;
END //

DELIMITER ;

-- =====================================================
-- Проверка целостности данных
-- =====================================================

-- Функция для проверки корректности данных
DELIMITER //
CREATE FUNCTION CheckDataIntegrity() 
RETURNS TEXT
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE result TEXT DEFAULT 'OK';
    DECLARE orphaned_logs INT DEFAULT 0;
    DECLARE invalid_times INT DEFAULT 0;
    
    -- Проверяем orphaned записи в logs
    SELECT COUNT(*) INTO orphaned_logs
    FROM logs l
    LEFT JOIN users u ON l.users_id = u.id
    LEFT JOIN staff s ON l.staff_id = s.id
    LEFT JOIN operations o ON l.operations_id = o.id
    WHERE u.id IS NULL OR s.id IS NULL OR o.id IS NULL;
    
    -- Проверяем некорректные времена
    SELECT COUNT(*) INTO invalid_times
    FROM logs
    WHERE finish_at IS NOT NULL AND finish_at < start_at;
    
    IF orphaned_logs > 0 THEN
        SET result = CONCAT('Found ', orphaned_logs, ' orphaned log records');
    ELSEIF invalid_times > 0 THEN
        SET result = CONCAT('Found ', invalid_times, ' records with invalid times');
    END IF;
    
    RETURN result;
END //
DELIMITER ;

-- =====================================================
-- Комментарии и документация
-- =====================================================

/*
ИСПОЛЬЗОВАНИЕ:

1. Для начала операции:
   CALL StartOperation(user_id, staff_id, operation_id, 'комментарий', NOW());

2. Для завершения операции:
   CALL FinishOperation(staff_id, NOW());

3. Для просмотра отчетов:
   SELECT * FROM v_logs_report WHERE DATE(start_at) = CURDATE();

4. Для просмотра активных операций:
   SELECT * FROM v_active_operations;

5. Для проверки целостности:
   SELECT CheckDataIntegrity();

ИНДЕКСЫ:
- Все внешние ключи проиндексированы
- Добавлены составные индексы для частых запросов
- Полнотекстовый поиск по сотрудникам

ПРОИЗВОДИТЕЛЬНОСТЬ:
- Используйте LIMIT в запросах к большим таблицам
- Регулярно анализируйте план выполнения запросов
- Архивируйте старые записи из logs (старше 1 года)
*/ 