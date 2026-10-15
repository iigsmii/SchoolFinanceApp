import java.nio.file.*;
import java.util.*;
import javax.tools.*;
import com.sun.source.util.JavacTask;
import java.net.*;

/** Run from the repository root: java tests/JavaChecks.java */
class JavaChecks {
    public static void main(String[] args) throws Exception {
        JavaCompiler compiler=ToolProvider.getSystemJavaCompiler();
        if(compiler==null)throw new IllegalStateException("A JDK, not just a JRE, is required.");
        DiagnosticCollector<JavaFileObject> diagnostics=new DiagnosticCollector<>();
        StandardJavaFileManager fm=compiler.getStandardFileManager(diagnostics,null,java.nio.charset.StandardCharsets.UTF_8);
        Path source=Paths.get("app/src/main/java/com/example/hesabdari");
        List<java.io.File> files=new ArrayList<>();
        try(var stream=Files.list(source)){stream.filter(p->p.toString().endsWith(".java")).forEach(p->files.add(p.toFile()));}
        JavacTask task=(JavacTask)compiler.getTask(null,fm,diagnostics,List.of("-proc:none"),null,fm.getJavaFileObjectsFromFiles(files));
        task.parse();
        for(var d:diagnostics.getDiagnostics())if(d.getKind()==Diagnostic.Kind.ERROR)throw new AssertionError(d.toString());
        System.out.println("PASS Java syntax parse: "+files.size()+" source files (not Android compilation)");
        Path classes=Files.createTempDirectory("finance-date-tests");
        int result=compiler.run(null,null,null,"-encoding","UTF-8","-d",classes.toString(),source.resolve("FinanceDate.java").toString());
        if(result!=0)throw new AssertionError("FinanceDate compile failed");
        try(URLClassLoader loader=new URLClassLoader(new URL[]{classes.toUri().toURL()})){
            Class<?> d=Class.forName("com.example.hesabdari.FinanceDate",true,loader);
            var iso=d.getMethod("iso",String.class);
            if(!"2026-04-01".equals(iso.invoke(null,"1405/01/12")))throw new AssertionError("Month boundary");
            if(!"2026-10-01".equals(iso.invoke(null,"۱۴۰۵/۰۷/۰۹")))throw new AssertionError("Persian numerals");
            for(String bad:List.of("1405/07/31","1404/12/30","oops","1405/13/01")){
                try{iso.invoke(null,bad);throw new AssertionError("Accepted invalid date "+bad);}
                catch(java.lang.reflect.InvocationTargetException expected){}
            }
            var to=d.getMethod("toGregorian",int.class,int.class,int.class);
            var from=d.getMethod("fromGregorian",int.class,int.class,int.class);
            var days=d.getMethod("daysInMonth",int.class,int.class);
            int count=0;
            for(int y=1400;y<=1415;y++)for(int m=1;m<=12;m++)for(int day=1;day<=(Integer)days.invoke(null,y,m);day++){
                int[] g=(int[])to.invoke(null,y,m,day);
                java.time.LocalDate.of(g[0],g[1],g[2]);
                int[] j=(int[])from.invoke(null,g[0],g[1],g[2]);
                if(!Arrays.equals(j,new int[]{y,m,day}))throw new AssertionError("Round-trip "+y+"/"+m+"/"+day);
                count++;
            }
            System.out.println("PASS FinanceDate: "+count+" valid dates round-trip; boundaries, Persian digits, invalid dates");
        }
        fm.close();
    }
}
