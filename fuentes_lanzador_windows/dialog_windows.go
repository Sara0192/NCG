//go:build windows
package main
import("syscall";"unsafe")
func messageBox(title,message string){
 user32:=syscall.NewLazyDLL("user32.dll")
 msg:=user32.NewProc("MessageBoxW")
 titleptr:=syscall.StringToUTF16Ptr(title)
 msgptr:=syscall.StringToUTF16Ptr(message)
 _,_,_=msg.Call(0,uintptr(unsafe.Pointer(msgptr)),uintptr(unsafe.Pointer(titleptr)),0x10)
}
