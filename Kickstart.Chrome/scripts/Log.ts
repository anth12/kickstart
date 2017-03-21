/// <reference path="typings/jQuery.d.ts"/>

class Log {

    public static Clear() {
        $('ul.log').slideUp("fast", function(){
            $('ul.log')
                .html('')
                .slideDown();
        });
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
        $('ul.log').append(`<li class="${type}">
                                ${message}
                            </li>`);
    }
}