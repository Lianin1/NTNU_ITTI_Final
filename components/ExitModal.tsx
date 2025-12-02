// components/ExitModal.tsx
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

interface ExitModalProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ExitModal({ visible, onConfirm, onCancel }: ExitModalProps) {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onCancel} // Android 返回鍵處理
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          
          <Text style={styles.modalTitle}>退出仙途</Text>
          <Text style={styles.modalText}>
            確定要放棄當前進度並重新開始嗎？
            {"\n"}此操作無法復原。
          </Text>

          <View style={styles.buttonRow}>
            {/* 取消按鈕 */}
            <Pressable
              style={[styles.button, styles.buttonCancel]}
              onPress={onCancel}
            >
              <Text style={styles.textStyle}>再想想</Text>
            </Pressable>

            {/* 確定按鈕 */}
            <Pressable
              style={[styles.button, styles.buttonConfirm]}
              onPress={onConfirm}
            >
              <Text style={[styles.textStyle, styles.textConfirm]}>確定退出</Text>
            </Pressable>
          </View>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)', // 半透明黑色遮罩
  },
  modalView: {
    width: '80%',
    maxWidth: 400,
    backgroundColor: '#111', // 深灰背景
    borderRadius: 10,
    padding: 25,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#444',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    marginBottom: 15,
    textAlign: 'center',
    color: '#FFF',
    fontSize: 22,
    fontFamily: 'NotoSerifTC_700Bold',
  },
  modalText: {
    marginBottom: 25,
    textAlign: 'center',
    color: '#CCC',
    fontSize: 16,
    fontFamily: 'NotoSerifTC_400Regular',
    lineHeight: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  button: {
    borderRadius: 5,
    padding: 12,
    elevation: 2,
    width: '45%',
    alignItems: 'center',
    borderWidth: 1,
  },
  buttonCancel: {
    backgroundColor: 'transparent',
    borderColor: '#666',
  },
  buttonConfirm: {
    backgroundColor: '#333',
    borderColor: '#FF4444', // 紅色邊框警示
  },
  textStyle: {
    color: '#CCC',
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: 'NotoSerifTC_400Regular',
  },
  textConfirm: {
    color: '#FF4444', // 紅色文字
  },
});