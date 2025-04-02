-- LumosDB 测试SQL脚本
-- 创建表
CREATE TABLE IF NOT EXISTS cli_test_table (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  value REAL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 插入数据
INSERT INTO cli_test_table (id, name, value) VALUES (1, 'test1', 10.5);
INSERT INTO cli_test_table (id, name, value) VALUES (2, 'test2', 20.5);
INSERT INTO cli_test_table (id, name, value) VALUES (3, 'test3', 30.5);

-- 查询数据
SELECT * FROM cli_test_table;

-- 更新数据
UPDATE cli_test_table SET value = value * 2 WHERE id = 1;

-- 查询更新后的数据
SELECT * FROM cli_test_table WHERE id = 1;

-- 删除表
DROP TABLE IF EXISTS cli_test_table; 