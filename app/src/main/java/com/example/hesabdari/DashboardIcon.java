package com.example.hesabdari;

import android.graphics.Canvas;
import android.graphics.ColorFilter;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.PixelFormat;
import android.graphics.drawable.Drawable;

/** Small, consistent ledger-inspired outline icons. No emoji font dependency. */
public final class DashboardIcon extends Drawable {
    private final String kind; private final Paint p=new Paint(Paint.ANTI_ALIAS_FLAG); private final int size;
    public DashboardIcon(String kind,int color,int size){this.kind=kind;this.size=size;p.setColor(color);p.setStyle(Paint.Style.STROKE);p.setStrokeWidth(1.7f);p.setStrokeCap(Paint.Cap.ROUND);p.setStrokeJoin(Paint.Join.ROUND);}
    @Override public int getIntrinsicWidth(){return size;}
    @Override public int getIntrinsicHeight(){return size;}
    @Override public void draw(Canvas c){
        c.save();c.translate(getBounds().left,getBounds().top);c.scale(getBounds().width()/24f,getBounds().height()/24f);
        if(kind.equals("students")||kind.equals("managers")){
            c.drawCircle(12,7,3,p);c.drawArc(5,12,19,24,180,180,false,p);c.drawLine(5,19,19,19,p);
        }else if(kind.equals("bank")||kind.equals("schools")){
            Path roof=new Path();roof.moveTo(3,8);roof.lineTo(12,3);roof.lineTo(21,8);roof.close();c.drawPath(roof,p);
            for(int x=6;x<=18;x+=6)c.drawLine(x,11,x,19,p);c.drawLine(3,21,21,21,p);
        }else if(kind.equals("report")){
            c.drawLine(4,20,21,20,p);c.drawLine(4,20,4,4,p);c.drawLine(9,17,9,12,p);c.drawLine(14,17,14,8,p);c.drawLine(19,17,19,4,p);
        }else if(kind.equals("receipts")||kind.equals("claim")){
            c.drawRoundRect(3,5,21,19,3,3,p);c.drawLine(3,10,21,10,p);c.drawLine(7,15,11,15,p);
        }else if(kind.equals("settings")){
            c.drawCircle(12,12,4,p);c.drawCircle(12,12,8,p);
            for(int i=0;i<8;i++){c.save();c.rotate(i*45,12,12);c.drawLine(12,1,12,4,p);c.restore();}
        }else if(kind.equals("messages")){
            c.drawRoundRect(3,4,21,17,3,3,p);c.drawLine(7,17,7,21,p);c.drawLine(7,21,12,17,p);c.drawLine(7,9,17,9,p);c.drawLine(7,13,14,13,p);
        }else{
            c.drawRoundRect(5,2,19,22,2,2,p);c.drawLine(9,7,15,7,p);c.drawLine(9,12,15,12,p);c.drawLine(9,17,13,17,p);
        }
        c.restore();
    }
    @Override public void setAlpha(int alpha){p.setAlpha(alpha);invalidateSelf();}
    @Override public void setColorFilter(ColorFilter filter){p.setColorFilter(filter);invalidateSelf();}
    @Override public int getOpacity(){return PixelFormat.TRANSLUCENT;}
}
