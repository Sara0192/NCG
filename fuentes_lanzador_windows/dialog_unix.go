//go:build !windows
package main
func messageBox(title,message string){println(title+": "+message)}
