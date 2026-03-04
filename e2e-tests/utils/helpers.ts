import { Page } from '@playwright/test';

/**
 * 生成随机的唯一标识符
 */
export function generateUniqueId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 生成随机商品编码
 */
export function generateProductCode(): string {
  return `PROD-${generateUniqueId()}`;
}

/**
 * 生成随机 SKU 编码
 */
export function generateSkuCode(): string {
  return `SKU-${generateUniqueId()}`;
}

/**
 * 生成随机客户编码 (限制在 20 字符内)
 */
export function generateCustomerCode(): string {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `M${timestamp}${random}`;
}

/**
 * 生成随机订单编号
 */
export function generateOrderNo(): string {
  return `ORD-${Date.now()}`;
}

/**
 * 等待元素可见
 */
export async function waitForElement(page: Page, selector: string, timeout: number = 10000) {
  await page.waitForSelector(selector, { state: 'visible', timeout });
}

/**
 * 等待表格加载完成
 */
export async function waitForTableLoad(page: Page, timeout: number = 10000) {
  await page.waitForSelector('.el-table__body-wrapper tr', { state: 'visible', timeout });
}

/**
 * 等待对话框打开
 */
export async function waitForDialog(page: Page, timeout: number = 5000) {
  await page.waitForSelector('.el-dialog', { state: 'visible', timeout });
}

/**
 * 关闭对话框
 */
export async function closeDialog(page: Page) {
  const closeButton = page.locator('.el-dialog__headerbtn');
  if (await closeButton.count() > 0) {
    await closeButton.click();
    await page.waitForSelector('.el-dialog', { state: 'hidden' });
  }
}

/**
 * 等待消息提示出现
 */
export async function waitForMessage(page: Page, timeout: number = 5000) {
  await page.waitForSelector('.el-message', { state: 'visible', timeout });
}

/**
 * 获取消息提示文本
 */
export async function getMessageText(page: Page): Promise<string> {
  const message = page.locator('.el-message__content');
  return await message.textContent() || '';
}

/**
 * 检查是否有错误消息
 */
export async function hasErrorMessage(page: Page): Promise<boolean> {
  const error = page.locator('.el-message--error');
  return await error.count() > 0;
}

/**
 * 点击确定按钮（对话框中）
 */
export async function clickConfirmButton(page: Page) {
  await page.click('.el-dialog button:has-text("确定")');
}

/**
 * 点击取消按钮（对话框中）
 */
export async function clickCancelButton(page: Page) {
  await page.click('.el-dialog button:has-text("取消")');
}

/**
 * 填写表单输入框
 */
export async function fillInput(page: Page, label: string, value: string) {
  const input = page.locator(`.el-form-item:has-text("${label}") input`);
  await input.fill(value);
}

/**
 * 选择下拉框选项
 */
export async function selectOption(page: Page, label: string, option: string) {
  await page.click(`.el-form-item:has-text("${label}") .el-select`);
  await page.click(`.el-select-dropdown__item:has-text("${option}")`);
}

/**
 * 获取表格行数
 */
export async function getTableRowCount(page: Page): Promise<number> {
  const rows = page.locator('.el-table__body-wrapper tr');
  return await rows.count();
}

/**
 * 获取表格单元格文本
 */
export async function getTableCellText(page: Page, row: number, column: number): Promise<string> {
  const cell = page.locator(`.el-table__body-wrapper tr:nth-child(${row}) td:nth-child(${column})`);
  return await cell.textContent() || '';
}

/**
 * 点击表格行中的按钮
 */
export async function clickTableRowButton(page: Page, row: number, buttonText: string) {
  await page.click(`.el-table__body-wrapper tr:nth-child(${row}) button:has-text("${buttonText}")`);
}

/**
 * 检查元素是否可见
 */
export async function isVisible(page: Page, selector: string): Promise<boolean> {
  const element = page.locator(selector);
  return await element.isVisible();
}

/**
 * 等待页面加载完成
 */
export async function waitForPageLoad(page: Page, timeout: number = 30000) {
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * 截图并保存
 */
export async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({ path: `screenshots/${name}.png`, fullPage: true });
}

/**
 * 清除输入框内容
 */
export async function clearInput(page: Page, selector: string) {
  await page.fill(selector, '');
}

/**
 * 格式化日期
 */
export function formatDate(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

/**
 * 格式化时间
 */
export function formatDateTime(date: Date = new Date()): string {
  return date.toISOString().replace('T', ' ').substr(0, 19);
}

/**
 * 随机数生成
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 随机金额生成
 */
export function randomAmount(min: number = 100, max: number = 10000): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

/**
 * 随机手机号生成
 */
export function randomPhone(): string {
  const prefixes = ['138', '139', '150', '151', '152', '158', '159', '186', '187', '188'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  return `${prefix}${suffix}`;
}

/**
 * 随机姓名生成
 */
export function randomName(): string {
  const surnames = ['张', '李', '王', '刘', '陈', '杨', '赵', '黄', '周', '吴'];
  const names = ['伟', '芳', '娜', '秀英', '敏', '静', '丽', '强', '磊', '军'];
  return `${surnames[Math.floor(Math.random() * surnames.length)]}${names[Math.floor(Math.random() * names.length)]}`;
}
