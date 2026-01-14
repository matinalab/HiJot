; 自定义 NSIS 安装脚本 - HiJot
; 功能：确保安装目录始终以产品名称结尾
; 例如：用户选择 D:\Program Files，实际安装到 D:\Program Files\HiJot

!include "WordFunc.nsh"

!macro preInit
  ; 预初始化阶段
!macroend

!macro customInit
  ; 初始化完成后，检查并修正安装目录
  ; 获取路径长度
  StrLen $R1 $INSTDIR
  ; 获取产品名称长度
  StrLen $R2 "${PRODUCT_NAME}"
  
  ; 计算起始位置
  IntOp $R3 $R1 - $R2
  
  ; 如果路径长度小于产品名称长度，直接追加
  IntCmp $R3 0 _customInit_appendName _customInit_appendName _customInit_checkEnd
  
  _customInit_checkEnd:
    ; 获取路径末尾部分
    StrCpy $R4 $INSTDIR $R2 $R3
    ; 比较是否等于产品名称
    StrCmp $R4 "${PRODUCT_NAME}" _customInit_done _customInit_appendName
  
  _customInit_appendName:
    StrCpy $INSTDIR "$INSTDIR\${PRODUCT_NAME}"
  
  _customInit_done:
!macroend

; 目录页面离开时的验证回调
Function .onVerifyInstDir
  ; 每次用户更改目录时都会调用此函数
  ; 在这里确保路径以产品名称结尾
  
  ; 获取路径长度
  StrLen $R1 $INSTDIR
  ; 获取产品名称长度  
  StrLen $R2 "${PRODUCT_NAME}"
  
  ; 计算起始位置
  IntOp $R3 $R1 - $R2
  
  ; 如果路径太短，允许继续（用户还在输入）
  IntCmp $R3 0 0 0 checkEnd
  Goto done
  
  checkEnd:
    ; 获取路径末尾部分
    StrCpy $R4 $INSTDIR $R2 $R3
    ; 如果已经以产品名称结尾，允许
    StrCmp $R4 "${PRODUCT_NAME}" done 0
    
    ; 检查是否以 \ProductName 结尾
    IntOp $R5 $R2 + 1
    IntOp $R6 $R1 - $R5
    IntCmp $R6 0 done done 0
    StrCpy $R7 $INSTDIR $R5 $R6
    StrCmp $R7 "\${PRODUCT_NAME}" done 0
    
    ; 不以产品名称结尾，自动追加
    StrCpy $INSTDIR "$INSTDIR\${PRODUCT_NAME}"
  
  done:
FunctionEnd
