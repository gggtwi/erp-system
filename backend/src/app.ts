import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import dotenv from 'dotenv'

dotenv.config()

const app = express()

// 中间件
app.use(helmet())
app.use(cors())
app.use(morgan('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API 路由
import authRoutes from './routes/auth'
import categoryRoutes from './routes/category'
import productRoutes from './routes/product'
import skuRoutes from './routes/sku'
import inventoryRoutes from './routes/inventory'
import customerRoutes from './routes/customer'
import saleRoutes from './routes/sale'
import financeRoutes from './routes/finance'

app.use('/api/auth', authRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/products', productRoutes)
app.use('/api/skus', skuRoutes)
app.use('/api/inventory', inventoryRoutes)
app.use('/api/customers', customerRoutes)
app.use('/api/sales', saleRoutes)
app.use('/api/finance', financeRoutes)

// 404 处理
app.use((req, res) => {
  res.status(404).json({ code: 404, message: 'Not Found' })
})

// 错误处理
import { errorHandler } from './middlewares/error'
app.use(errorHandler)

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
})

export default app
