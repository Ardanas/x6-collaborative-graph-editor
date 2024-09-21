<template>
  <dialog ref="dialog" class="user-info-dialog">
    <form @submit.prevent="submitForm">
      <h2>设置用户信息</h2>
      <div class="form-group">
        <label for="username"><span class="required">*</span>用户名 (最多8位)</label>
        <input id="username" v-model="username" maxlength="8" required>
      </div>
      <div class="form-group">
        <label for="roomName"><span class="required">*</span>房间名</label>
        <input id="roomName" v-model="roomName" required>
      </div>
      <button type="submit">保存</button>
    </form>
  </dialog>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue';

export default defineComponent({
  name: 'UserInfoDialog',
  emits: ['info-saved'],
  setup(props, { emit }) {
    const dialog = ref<HTMLDialogElement | null>(null);
    const username = ref('');
    const roomName = ref('');

    onMounted(() => {
      if (dialog.value) {
        dialog.value.showModal();
      }
    });

    const generateRandomColor = () => {
      return '#' + Math.floor(Math.random()*16777215).toString(16);
    };

    const submitForm = () => {
      const userColor = generateRandomColor();
      const userInfo = {
        username: username.value,
        roomName: roomName.value,
        userColor: userColor
      };
      localStorage.setItem('userInfo', JSON.stringify(userInfo));
      emit('info-saved', userInfo);
      if (dialog.value) {
        dialog.value.close();
      }
    };

    return { dialog, username, roomName, submitForm };
  },
});
</script>

<style scoped>
.user-info-dialog {
  padding: 20px;
  border-radius: 8px;
  border: none;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  width: 300px; /* 设置一个固定宽度 */
  max-width: 90%; /* 确保在小屏幕上不会太宽 */
}

.user-info-dialog::backdrop {
  background-color: rgba(0, 0, 0, 0.5); /* 添加半透明背景 */
}

form {
  display: flex;
  flex-direction: column;
}

.form-group {
  margin-bottom: 15px;
}

label {
  display: block;
  margin-bottom: 5px;
}

.required {
  color: red;
  margin-left: 2px;
}

input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box; /* 确保padding不会增加总宽度 */
}

button {
  padding: 8px 16px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  align-self: flex-end; /* 将按钮对齐到右侧 */
}

button:hover {
  background-color: #45a049;
}

h2 {
  margin-top: 0;
  margin-bottom: 20px;
}
</style>