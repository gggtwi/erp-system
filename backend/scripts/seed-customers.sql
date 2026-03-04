-- 客户测试数据
-- 运行方式: 在 backend 目录下执行 npx prisma db execute --file scripts/seed-customers.sql

INSERT INTO customers (code, name, phone, address, creditLimit, balance, status, createdAt, updatedAt) VALUES
('VIP001', '张三', '13800138001', '北京市朝阳区建国路88号', 50000.00, 0.00, 'normal', datetime('now'), datetime('now')),
('VIP002', '李四', '13800138002', '上海市浦东新区陆家嘴金融中心', 30000.00, 1500.50, 'normal', datetime('now'), datetime('now')),
('VIP003', '王五', '13800138003', '广州市天河区体育西路103号', 20000.00, 0.00, 'normal', datetime('now'), datetime('now')),
('MEM001', '赵六', '13900139001', '深圳市南山区科技园', 10000.00, 3200.00, 'normal', datetime('now'), datetime('now')),
('MEM002', '钱七', '13900139002', '杭州市西湖区文三路', 10000.00, 0.00, 'normal', datetime('now'), datetime('now')),
('MEM003', '孙八', '13900139003', '成都市高新区天府大道', 15000.00, 800.00, 'normal', datetime('now'), datetime('now')),
('MEM004', '周九', '13900139004', '武汉市武昌区中南路', 8000.00, 0.00, 'normal', datetime('now'), datetime('now')),
('MEM005', '吴十', '13900139005', '南京市鼓楼区中山路', 12000.00, 0.00, 'normal', datetime('now'), datetime('now')),
('TMP2025030401', '临时客户-TMP2025030401', NULL, NULL, 0.00, 0.00, 'normal', datetime('now'), datetime('now')),
('TMP2025030402', '临时客户-TMP2025030402', NULL, NULL, 0.00, 0.00, 'normal', datetime('now'), datetime('now'));

-- 更新序列（SQLite 自增ID）
-- 已自动处理
