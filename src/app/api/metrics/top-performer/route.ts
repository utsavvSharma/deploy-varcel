import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const salesData = await prisma.lead.groupBy({
      by: ['assignedTo'],
      where: {
        status: 'CONVERTED',
        assignedTo: { not: null },
        saleAmount: { not: null },
      },
      _sum: {
        saleAmount: true,
      },
      _count: {
        id: true,
      },
    });

    if (salesData.length === 0) {
      return NextResponse.json({ user: null });
    }

    const topPerformer = salesData.reduce((top, current) => {
      const currentAmount = Number(current._sum.saleAmount || 0);
      const topAmount = Number(top?._sum?.saleAmount || 0);
      return currentAmount > topAmount ? current : top;
    }, salesData[0]);

    if (topPerformer?.assignedTo) {
      const user = await prisma.user.findUnique({
        where: { id: topPerformer.assignedTo },
        select: { id: true, name: true },
      });
      
      return NextResponse.json({
        user: { id: user?.id, name: user?.name },
        totalAmount: topPerformer._sum.saleAmount,
        totalSales: topPerformer._count.id,
      });
    }

    return NextResponse.json({ user: null });
  } catch (error) {
    console.error("Error fetching top performer:", error);
    return NextResponse.json({ error: "Failed to fetch top performer" }, { status: 500 });
  }
}
