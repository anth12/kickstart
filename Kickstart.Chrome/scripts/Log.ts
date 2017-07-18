/// <reference path="typings/jQuery.d.ts"/>

class Log {

    public static Clear () {
        $('ul.log').html('');
    }

    public static Info (message: string) { 
        this.WriteLog(message, 'info'); 
    }

    public static Warn (message: string) { 
        this.WriteLog(message, 'warn'); 
    }

    public static Error (message: string) { 
        this.WriteLog(message, 'error'); 
    }

    private static WriteLog(message: string, type: string): void{

        setTimeout(()=>{
            $('ul.log').append(`<li class="${type}">
                                    ${message}
                                </li>`);
        }, 50);
    }
}