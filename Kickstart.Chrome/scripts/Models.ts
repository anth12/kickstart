class KickResult {

    constructor(success: boolean, url: string, time: number){
        this.Success = success;
        this.Url = url;
        this.Time = time;
    }

    public Success: boolean;
    public Url: string;
    public Time: number;
}