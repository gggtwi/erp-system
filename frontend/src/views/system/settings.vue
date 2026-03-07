<template>
  <div class="settings-page" data-testid="settings-page">
    <el-card data-testid="settings-card">
      <template #header>
        <div class="card-header">
          <span>系统设置</span>
        </div>
      </template>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="150px"
        data-testid="settings-form"
      >
        <el-form-item label="系统名称" prop="systemName" data-testid="system-name-item">
          <el-input
            v-model="form.systemName"
            placeholder="请输入系统名称"
            data-testid="system-name-input"
          />
        </el-form-item>

        <el-form-item label="库存预警阈值" prop="inventoryThreshold" data-testid="inventory-threshold-item">
          <el-input-number
            v-model="form.inventoryThreshold"
            :min="0"
            :max="9999"
            data-testid="inventory-threshold-input"
          />
          <span class="form-tip">库存低于此数值时触发预警</span>
        </el-form-item>

        <el-form-item label="消息通知" prop="notificationEnabled" data-testid="notification-item">
          <el-switch
            v-model="form.notificationEnabled"
            active-text="开启"
            inactive-text="关闭"
            data-testid="notification-switch"
          />
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            :loading="saving"
            data-testid="save-settings-btn"
            @click="handleSave"
          >
            保存设置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'

const formRef = ref<FormInstance>()
const saving = ref(false)

const form = reactive({
  systemName: '',
  inventoryThreshold: 10,
  notificationEnabled: true,
})

const rules: FormRules = {
  systemName: [
    { required: true, message: '请输入系统名称', trigger: 'blur' },
    { min: 2, max: 50, message: '系统名称长度为2-50个字符', trigger: 'blur' },
  ],
  inventoryThreshold: [
    { required: true, message: '请输入库存预警阈值', trigger: 'blur' },
    { type: 'number', min: 0, max: 9999, message: '阈值范围为0-9999', trigger: 'blur' },
  ],
}

// 模拟加载设置
function loadSettings() {
  // 实际项目中应该从API获取
  form.systemName = 'ERP管理系统'
  form.inventoryThreshold = 10
  form.notificationEnabled = true
}

// 保存设置
async function handleSave() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  saving.value = true
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 500))
    ElMessage.success('设置保存成功')
  } catch (error) {
    ElMessage.error('设置保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadSettings()
})
</script>

<style scoped lang="scss">
.settings-page {
  .card-header {
    font-size: 18px;
    font-weight: 500;
  }

  .form-tip {
    margin-left: 12px;
    color: #909399;
    font-size: 13px;
  }
}
</style>
