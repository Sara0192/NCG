package main

import (
 "crypto/rand"
 "encoding/hex"
 "encoding/json"
 "errors"
 "fmt"
 "io"
 "log"
 "net"
 "net/http"
 "os"
 "os/exec"
 "path/filepath"
 "runtime"
 "strings"
 "sync"
 "time"
)

// NCG Windows offline launcher. It runs an authenticated, loopback-only HTTP
// server, opens an installed Chromium-compatible browser in isolated app mode,
// and stores progress as atomic JSON files outside the game installation.
var saveFiles = map[string]string{
 "ncg_v6_session":"partida.json",
 "ncg_v6_history":"historial.json",
 "ncg_v646_campaign_days":"campana.json",
 "ncg_v647_campaign_days":"campana_anterior.json",
 "ncg_desktop_qol_v1":"preferencias.json",
 "ncg_desktop_qol_v2":"preferencias_v2.json",
 "ncg_v64_visual_mode":"modo_visual.json",
 "ncg_gallery_visual_mode":"modo_galeria.json",
 "ncg_shader_visual_mode":"modo_shaders.json",
 "ncg_v6_sfx_enabled":"sfx_activado.json",
 "ncg_v16_sfx_volume":"volumen_sfx.json",
}

type app struct {
 token string
 root string
 data string
 base string
 mu sync.Mutex
}

func fatal(err error) {
 log.Printf("NCG Windows: %v",err)
 messageBox("NCG - No se pudo iniciar", err.Error())
 os.Exit(1)
}

func randomToken() string {
 b:=make([]byte,32)
 if _,err:=rand.Read(b);err!=nil{fatal(err)}
 return hex.EncodeToString(b)
}

func atomicWrite(path string,data []byte) error {
 temp:=path+".new"
 if err:=os.WriteFile(temp,data,0600);err!=nil{return err}
 if err:=os.Rename(temp,path);err!=nil{os.Remove(temp);return err}
 return nil
}

func (a *app) authorize(w http.ResponseWriter,r *http.Request) bool {
 w.Header().Set("Cache-Control","no-store")
 if r.Header.Get("Authorization")!="Bearer "+a.token || (r.Header.Get("Origin")!="" && r.Header.Get("Origin")!=a.base) {
  http.Error(w,"No autorizado",http.StatusForbidden);return false
 }
 return true
}

func jsonResponse(w http.ResponseWriter,data any) {
 w.Header().Set("Content-Type","application/json; charset=utf-8")
 if err:=json.NewEncoder(w).Encode(data);err!=nil{log.Printf("Respuesta JSON: %v",err)}
}

func (a *app) state(w http.ResponseWriter,r *http.Request){
 if r.Method!="GET"{http.Error(w,"Método no permitido",405);return}
 if !a.authorize(w,r){return}
 a.mu.Lock();defer a.mu.Unlock()
 state:=make(map[string]string)
 for key,file:=range saveFiles {
  raw,err:=os.ReadFile(filepath.Join(a.data,file))
  if err==nil && len(raw)<30<<20{state[key]=string(raw)}
 }
 jsonResponse(w,state)
}

func (a *app) save(w http.ResponseWriter,r *http.Request){
 if r.Method!="POST"{http.Error(w,"Método no permitido",405);return}
 if !a.authorize(w,r){return}
 r.Body=http.MaxBytesReader(w,r.Body,40<<20)
 var batch map[string]string
 dec:=json.NewDecoder(r.Body)
 if err:=dec.Decode(&batch);err!=nil{http.Error(w,"Datos no válidos: "+err.Error(),400);return}
 if len(batch)>len(saveFiles){http.Error(w,"Demasiadas claves",400);return}
 for key,value:=range batch{
  if _,ok:=saveFiles[key];!ok || len(value)>25<<20 || !json.Valid([]byte(value)){
   http.Error(w,"Clave o JSON inválido",400);return
  }
 }
 a.mu.Lock();defer a.mu.Unlock()
 for key,value:=range batch{
  if err:=atomicWrite(filepath.Join(a.data,saveFiles[key]),[]byte(value));err!=nil{
   http.Error(w,"No se pudo guardar: "+err.Error(),500);return
  }
 }
 jsonResponse(w,map[string]bool{"success":true})
}

func (a *app) backup(w http.ResponseWriter,r *http.Request){
 if r.Method!="POST"{http.Error(w,"Método no permitido",405);return}
 if !a.authorize(w,r){return}
 r.Body=http.MaxBytesReader(w,r.Body,40<<20)
 var req struct{Text string `json:"text"`;Filename string `json:"filename"`}
 if err:=json.NewDecoder(r.Body).Decode(&req);err!=nil{http.Error(w,"Respaldo inválido",400);return}
 if len(req.Text)==0||len(req.Text)>30<<20 ||!json.Valid([]byte(req.Text)){http.Error(w,"JSON inválido",400);return}
 filename:=filepath.Base(req.Filename)
 if filename==""||filename=="."||filename==".."||strings.ContainsAny(filename,":\\/")||!strings.HasSuffix(strings.ToLower(filename),".json") {filename="NCG_respaldo.json"}
 home,_:=os.UserHomeDir(); dest:=filepath.Join(home,"Documents","NCG","Respaldos")
 if err:=os.MkdirAll(dest,0700);err!=nil{dest=filepath.Join(a.data,"Respaldos");if err=os.MkdirAll(dest,0700);err!=nil{http.Error(w,err.Error(),500);return}}
 filename=strings.TrimSuffix(filename,".json")+"_"+time.Now().Format("20060102_150405")+".json"
 path:=filepath.Join(dest,filename)
 if err:=atomicWrite(path,[]byte(req.Text));err!=nil{http.Error(w,"Error al exportar: "+err.Error(),500);return}
 jsonResponse(w,map[string]string{"path":path})
}

func (a *app) index(w http.ResponseWriter,r *http.Request){
 if r.URL.Path!="/"&&r.URL.Path!="/index.html"{http.NotFound(w,r);return}
 raw,err:=os.ReadFile(filepath.Join(a.root,"index.html"));if err!=nil{http.Error(w,"Falta resources/index.html",500);return}
 bootstrap:=`<script>window.NCGPortable={token:`+fmt.Sprintf("%q",a.token)+`};</script>`
 page:=strings.Replace(string(raw),`<script src="js/desktop_boot.js"></script>`,bootstrap+"\n"+`<script src="js/desktop_boot.js"></script>`,1)
 if page==string(raw){http.Error(w,"No se encontró la inicialización del juego",500);return}
 w.Header().Set("Content-Type","text/html; charset=utf-8")
 w.Header().Set("Cache-Control","no-store")
 w.Header().Set("X-Content-Type-Options","nosniff")
 _,_ = io.WriteString(w,page)
}

func (a *app) handler() http.Handler {
 fs:=http.FileServer(http.Dir(a.root))
 mux:=http.NewServeMux()
 mux.HandleFunc("/__ncg/state",a.state)
 mux.HandleFunc("/__ncg/save",a.save)
 mux.HandleFunc("/__ncg/backup",a.backup)
 mux.HandleFunc("/__ncg/health",func(w http.ResponseWriter,r *http.Request){jsonResponse(w,map[string]string{"version":"18.36.15","status":"ok"})})
 mux.HandleFunc("/",func(w http.ResponseWriter,r *http.Request){
  if r.URL.Path=="/" || r.URL.Path=="/index.html" {a.index(w,r);return}
  if strings.HasPrefix(r.URL.Path,"/__ncg/"){http.NotFound(w,r);return}
  w.Header().Set("Cache-Control","no-store")
  w.Header().Set("X-Content-Type-Options","nosniff")
  fs.ServeHTTP(w,r)
 })
 return mux
}

func findBrowser() (string,error){
 vars:=[]string{"ProgramFiles(x86)","ProgramFiles","LOCALAPPDATA"}
 suffixes:=[]string{
  `Microsoft\Edge\Application\msedge.exe`,
  `BraveSoftware\Brave-Browser\Application\brave.exe`,
  `Google\Chrome\Application\chrome.exe`,
 }
 // Prefer Edge, then Brave, then Chrome. All three open their own application
 // window without browser tabs or an address bar, using their own engine.
 for _,suffix:=range suffixes {for _,env:=range vars {
  if base:=os.Getenv(env);base!=""{
   p:=filepath.Join(base,suffix)
   if stat,err:=os.Stat(p);err==nil&&!stat.IsDir(){return p,nil}
  }
 }}
 for _,binary:=range []string{"msedge.exe","brave.exe","chrome.exe","msedge","brave","google-chrome","chromium"}{
  if p,err:=exec.LookPath(binary);err==nil{return p,nil}
 }
 return "",errors.New("No encontré Microsoft Edge, Brave ni Chrome. Instala o habilita uno de esos navegadores para iniciar NCG sin descargar componentes adicionales.")
}

func main(){
 exe,err:=os.Executable();if err!=nil{fatal(err)}
 root:=filepath.Join(filepath.Dir(exe),"resources")
 if _,err:=os.Stat(filepath.Join(root,"index.html"));err!=nil{fatal(errors.New("Falta la carpeta resources. Extrae primero TODO el ZIP de NCG en una carpeta antes de abrir el ejecutable."))}
 local:=os.Getenv("LOCALAPPDATA");if local==""{home,_:=os.UserHomeDir();local=filepath.Join(home,"AppData","Local")}
 data:=filepath.Join(local,"NCG","Guardados")
 if err:=os.MkdirAll(data,0700);err!=nil{fatal(err)}
 listener,err:=net.Listen("tcp","127.0.0.1:27861")
 if err!=nil {listener,err=net.Listen("tcp","127.0.0.1:0")};if err!=nil{fatal(err)}
 a:=&app{token:randomToken(),root:root,data:data,base:"http://"+listener.Addr().String()}
 server:=&http.Server{Handler:a.handler(),ReadHeaderTimeout:10*time.Second,IdleTimeout:90*time.Second}
 go func(){_ = server.Serve(listener)}()
 if os.Getenv("NCG_TEST_NO_BROWSER")=="1"{
  fmt.Println(a.base)
  select{}
 }
 browser,err:=findBrowser();if err!=nil{_ = listener.Close();fatal(err)}
 profile:=filepath.Join(local,"NCG","NavegadorAislado")
 _=os.MkdirAll(profile,0700)
 cmd:=exec.Command(browser,
  "--app="+a.base+"/", "--user-data-dir="+profile,
  "--no-first-run","--no-default-browser-check","--disable-background-mode",
  "--window-size=1560,920")
 if err:=cmd.Start();err!=nil{_ = listener.Close();fatal(fmt.Errorf("No se pudo abrir la ventana del juego: %w",err))}
 _=cmd.Wait()
 _=server.Close()
 if runtime.GOOS=="windows" {time.Sleep(75*time.Millisecond)}
}
