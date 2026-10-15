package com.example.hesabdari;

import java.util.Calendar;
import java.util.GregorianCalendar;
import java.util.Locale;
import java.util.TimeZone;

/** Calendar-only utility: deliberately independent of Activity and Android. */
public final class FinanceDate {
    private FinanceDate() {}
    public static int[] toGregorian(int jy, int jm, int jd) {
        if (jy < 1300 || jy > 1500 || jm < 1 || jm > 12 || jd < 1 || jd > (jm <= 6 ? 31 : 30))
            throw new IllegalArgumentException("تاریخ شمسی معتبر نیست.");
        int[] gdm={0,31,28,31,30,31,30,31,31,30,31,30,31};
        int[] jdm={0,31,31,31,31,31,31,30,30,30,30,30,29};
        int days=365*(jy-979)+((jy-979)/33)*8+(((jy-979)%33)+3)/4;
        for(int i=1;i<jm;i++) days+=jdm[i];
        days+=jd-1;
        int gday=days+79, gy=1600+400*(gday/146097);
        gday%=146097;
        boolean leap=true;
        if(gday>=36525){gday--;gy+=100*(gday/36524);gday%=36524;if(gday>=365)gday++;}
        gy+=4*(gday/1461);gday%=1461;
        if(gday>=366){leap=false;gday--;gy+=gday/365;gday%=365;}
        int gm=1;
        while(gday>=gdm[gm]+((gm==2&&leap)?1:0)){gday-=gdm[gm]+((gm==2&&leap)?1:0);gm++;}
        int[] g={gy,gm,gday+1};
        int[] back=fromGregorian(g[0],g[1],g[2]);
        if(back[0]!=jy || back[1]!=jm || back[2]!=jd)
            throw new IllegalArgumentException("روز انتخاب‌شده در این ماه وجود ندارد.");
        return g;
    }
    public static int[] fromGregorian(int gy,int gm,int gd) {
        Calendar check=new GregorianCalendar(TimeZone.getTimeZone("UTC"),Locale.US);
        check.setLenient(false);check.clear();check.set(gy,gm-1,gd);check.getTimeInMillis();
        int[] gdm={0,31,28,31,30,31,30,31,31,30,31,30,31};
        int gy2=gy-1600,gm2=gm-1,gd2=gd-1;
        int gday=365*gy2+(gy2+3)/4-(gy2+99)/100+(gy2+399)/400;
        for(int i=0;i<gm2;i++)gday+=gdm[i+1];
        if(gm>2&&((gy%4==0&&gy%100!=0)||gy%400==0))gday++;
        gday+=gd2;
        int jday=gday-79,jy=979+33*(jday/12053);
        jday%=12053;jy+=4*(jday/1461);jday%=1461;
        if(jday>=366){jy+=(jday-1)/365;jday=(jday-1)%365;}
        int jm,jd;
        if(jday<186){jm=1+jday/31;jd=1+jday%31;}
        else{jm=7+(jday-186)/30;jd=1+(jday-186)%30;}
        return new int[]{jy,jm,jd};
    }
    public static int daysInMonth(int y,int m) {
        if(m<=6)return 31;
        if(m<12)return 30;
        try{toGregorian(y,12,30);return 30;}catch(IllegalArgumentException e){return 29;}
    }
    public static String iso(String input) {
        if(input==null)throw new IllegalArgumentException("تاریخ الزامی است.");
        String s=latinDigits(input).trim();
        if(!s.matches("\\d{4}/\\d{1,2}/\\d{1,2}"))
            throw new IllegalArgumentException("تاریخ را به صورت سال/ماه/روز وارد کنید.");
        String[] p=s.split("/");
        int[] g=toGregorian(Integer.parseInt(p[0]),Integer.parseInt(p[1]),Integer.parseInt(p[2]));
        return String.format(Locale.US,"%04d-%02d-%02d",g[0],g[1],g[2]);
    }
    public static String latinDigits(String s) {
        StringBuilder b=new StringBuilder();
        for(char c:s.toCharArray()) {
            if(c>='۰'&&c<='۹')b.append((char)('0'+c-'۰'));
            else if(c>='٠'&&c<='٩')b.append((char)('0'+c-'٠'));
            else b.append(c);
        }
        return b.toString();
    }
}
