# -*- coding: utf-8 -*-
"""生成毕业设计说明书（.docx），套用模板格式"""
import os
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

SHOTS = r'E:\astro-vue\shots'
OUT = r'F:\rj\sxy\天文12website\毕业设计说明书-天文科普网站.docx'

doc = Document()

# ---------- 页面设置 ----------
sec = doc.sections[0]
sec.page_width, sec.page_height = Cm(21.0), Cm(29.7)
sec.top_margin, sec.bottom_margin = Cm(3.0), Cm(2.0)
sec.left_margin, sec.right_margin = Cm(3.0), Cm(2.5)


def set_style_font(st, ascii_font, ea_font, size, bold, color=RGBColor(0, 0, 0)):
    st.font.name = ascii_font
    st.font.size = Pt(size)
    st.font.bold = bold
    st.font.color.rgb = color
    rPr = st.element.get_or_add_rPr()
    rFonts = rPr.get_or_add_rFonts()
    rFonts.set(qn('w:eastAsia'), ea_font)


# ---------- 样式 ----------
normal = doc.styles['Normal']
set_style_font(normal, 'Times New Roman', '宋体', 12, False)
normal.paragraph_format.line_spacing = 1.5
normal.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY

for h, size in [('Heading 1', 16), ('Heading 2', 14), ('Heading 3', 14)]:
    st = doc.styles[h]
    set_style_font(st, 'Times New Roman', '黑体', size, True)
    st.paragraph_format.line_spacing = 1.5
    st.paragraph_format.space_before = Pt(6)
    st.paragraph_format.space_after = Pt(6)

# 页脚页码
footer_p = sec.footer.paragraphs[0]
footer_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = footer_p.add_run()
fld1 = OxmlElement('w:fldChar'); fld1.set(qn('w:fldCharType'), 'begin')
instr = OxmlElement('w:instrText'); instr.set(qn('xml:space'), 'preserve'); instr.text = 'PAGE'
fld2 = OxmlElement('w:fldChar'); fld2.set(qn('w:fldCharType'), 'end')
run._r.append(fld1); run._r.append(instr); run._r.append(fld2)


def para(text, style=None, align=None, indent=True, size=None, bold=False, ea='宋体', before=0, after=0):
    p = doc.add_paragraph(style=style)
    if align is not None:
        p.alignment = align
    r = p.add_run(text)
    if size: r.font.size = Pt(size)
    if bold: r.font.bold = True
    r.font.name = 'Times New Roman'
    r._element.get_or_add_rPr().get_or_add_rFonts().set(qn('w:eastAsia'), ea)
    if indent and style is None:
        p.paragraph_format.first_line_indent = Pt(24)
    p.paragraph_format.space_before = Pt(before)
    p.paragraph_format.space_after = Pt(after)
    return p


def heading1(t): para(t, style='Heading 1', align=WD_ALIGN_PARAGRAPH.CENTER)
def heading2(t): para(t, style='Heading 2')
def heading3(t): para(t, style='Heading 3')
def body(t): para(t)


def caption(t):
    p = para(t, align=WD_ALIGN_PARAGRAPH.CENTER, indent=False, size=10.5)
    p.paragraph_format.line_spacing = 1.2
    return p


def figure(path, width_cm=14.5):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.add_run().add_picture(path, width=Cm(width_cm))
    return p


# ===================== 封面 =====================
for _ in range(2):
    doc.add_paragraph()
para('无锡工艺职业技术学院', align=WD_ALIGN_PARAGRAPH.CENTER, indent=False, size=26, bold=True, ea='黑体')
doc.add_paragraph()
para('毕业设计说明书', align=WD_ALIGN_PARAGRAPH.CENTER, indent=False, size=42, bold=True, ea='黑体')
for _ in range(3):
    doc.add_paragraph()
para('题    目：天文科普网站的设计与实现', align=WD_ALIGN_PARAGRAPH.CENTER, indent=False, size=16, bold=True, ea='黑体')
doc.add_paragraph()
for label in ['系    部：    人工智能学院', '专    业：＿＿＿＿＿＿＿＿＿＿', '学    号：＿＿＿＿＿＿＿＿＿＿',
              '学生姓名：＿＿＿＿＿＿＿＿＿＿', '指导教师：    吴俊强', '职    称：    副教授']:
    para(label, align=WD_ALIGN_PARAGRAPH.CENTER, indent=False, size=18, bold=True, ea='黑体')
doc.add_paragraph()
para('年    月    日', align=WD_ALIGN_PARAGRAPH.CENTER, indent=False, size=18, bold=True, ea='黑体')
doc.add_page_break()

# ===================== 目录 =====================
para('目    录', align=WD_ALIGN_PARAGRAPH.CENTER, indent=False, size=15, bold=True, ea='黑体')
# TOC 域（Word 打开后可右键更新）
p = doc.add_paragraph()
run = p.add_run()
f1 = OxmlElement('w:fldChar'); f1.set(qn('w:fldCharType'), 'begin')
it = OxmlElement('w:instrText'); it.set(qn('xml:space'), 'preserve'); it.text = r'TOC \o "1-3" \h \z \u'
f2 = OxmlElement('w:fldChar'); f2.set(qn('w:fldCharType'), 'separate')
t = OxmlElement('w:t'); t.text = '（打开文档后，全选 Ctrl+A 再按 F9 自动生成目录）'
f3 = OxmlElement('w:fldChar'); f3.set(qn('w:fldCharType'), 'end')
run._r.append(f1); run._r.append(it); run._r.append(f2); run._r.append(t); run._r.append(f3)
doc.add_page_break()

# ===================== 第一章 =====================
heading1('第一章  绪论')
heading2('1.1  课题研究的背景、目的和意义')
body('天文学是人类最古老的自然科学之一。从古代先民仰望星空、观测天象，到现代天文学家借助大型望远镜与探测器探索深空，人类对宇宙的认知不断深入。随着互联网的普及，网络已经成为公众获取知识的主要渠道。然而，现有的天文科普资源普遍存在内容分散、形式单一、专业门槛较高等问题，普通公众往往难以系统、直观地了解天文知识。因此，开发一个内容系统、界面美观、互动性强的天文科普网站，具有重要的现实意义。')
body('本课题旨在设计并实现一个面向公众的天文科普网站“宇宙探索”。网站以图文并茂的形式，系统介绍太阳系行星、恒星与星系、黑洞、四季星座等天文知识，并提供星空图集、知识测验、探索工具等互动功能，降低天文学习的门槛，激发公众探索宇宙的兴趣。')
body('本课题的意义主要体现在以下三个方面：一是科普价值，网站以直观、生动的形式传播天文科学知识，有助于提升全民科学素质；二是实践价值，通过本课题可以综合运用 HTML、CSS、JavaScript 等前端开发技术，完整地经历网站规划、界面设计、页面开发与测试的全过程，锻炼工程实践能力；三是应用价值，网站可作为学校天文社团、科普宣传活动的展示与教学资源，也可在此基础上进一步扩展为功能完善的科普平台。')
heading2('1.2  主要研究内容')
body('本课题的主要研究内容包括以下几个方面：')
body('（1）网站整体规划与栏目设计。确定网站“宇宙探索”的主题定位，规划首页、太阳系行星、恒星与星系、黑洞科普、四季星座、星空图集、知识测验、探索工具等栏目，理清各页面之间的层次关系与导航结构。')
body('（2）网站视觉设计。围绕宇宙主题设计整体视觉风格，采用深色星空背景营造深邃氛围，运用渐变配色、卡片布局、图标与动画等元素提升页面的美观性与辨识度。')
body('（3）核心页面开发。使用 HTML 构建页面结构，使用 CSS 完成布局与样式，使用 JavaScript 实现交互，完成首页及各大栏目页面的开发。')
body('（4）交互功能实现。主要包括动态星空粒子背景、太阳系行星公转轨道动画、四季星座的季节筛选、星空图集的分类浏览、知识测验的即时评分以及页面滚动动画等。')
body('（5）页面兼容性与响应式适配。通过媒体查询等响应式技术，保证网站在不同屏幕尺寸与主流浏览器下均能正常显示和使用。')

# ===================== 第二章 =====================
heading1('第二章  网站开发相关技术')
heading2('2.1  HTML5 超文本标记语言')
body('HTML5 是用于构建网页结构和内容的标准标记语言，也是本网站页面骨架的实现基础。HTML5 提供了丰富的语义化标签，如 header、nav、section、footer 等，使得页面结构更加清晰、便于维护，也有利于搜索引擎优化。本网站利用 HTML5 语义化标签组织导航栏、内容分区与页脚等结构，并使用 canvas 元素绘制动态星空背景，使用 video 元素承载科普内容，充分体现了 HTML5 在多媒体与结构化内容方面的优势。')
heading2('2.2  CSS3 层叠样式表')
body('CSS3 负责网页的样式与布局，是实现网站视觉风格的核心技术。本网站利用 CSS3 实现了深色星空主题的配色方案，通过渐变（linear-gradient、radial-gradient）营造星云与行星的立体光影效果，运用盒阴影（box-shadow）与圆角（border-radius）塑造卡片式布局，并使用关键帧动画（@keyframes）与过渡（transition）实现行星公转、元素悬浮、图标旋转等动态效果。此外，借助媒体查询（@media）实现响应式布局，使网站在桌面端与移动端都能良好呈现。')
heading2('2.3  JavaScript 脚本语言')
body('JavaScript 是为网页赋予交互能力与动态行为的脚本语言。本网站使用 JavaScript 实现了多项核心交互功能：通过 Canvas 绘制并动画化星空粒子背景，模拟恒星闪烁与流星划过；实现太阳系行星公转轨道动画与行星信息的弹窗展示；实现四季星座的季节筛选、星空图集的分类筛选与图片放大浏览；实现知识测验的答题、判分与错题回顾逻辑；实现页面滚动时的导航栏样式切换、阅读进度提示等用户体验增强功能。JavaScript 与 HTML、CSS 三者协同，构成了网站前端的完整技术体系。')
heading2('2.4  开发工具与图标库')
body('在开发过程中，网站代码使用 Visual Studio Code 作为集成开发环境，该工具提供了代码高亮、智能提示与实时预览等便利功能；使用 Chrome、Edge 等主流浏览器的开发者工具进行页面调试与响应式测试。在界面元素方面，网站引入了 Font Awesome 图标库，通过矢量图标替代文字图标，在保证清晰度的同时提升了页面的视觉表现力与一致性。')

# ===================== 第三章 =====================
heading1('第三章  网站设计方案')
heading2('3.1  网站主题构思')
body('本网站以“宇宙探索”为主题，定位为面向公众的天文科普网站。在视觉设计上，整体采用深色星空背景，以黑色、深空蓝为主色调，营造宇宙深邃、神秘的氛围，并以金色、紫色等作为点缀色突出标题、按钮等关键元素；在内容组织上，按照天文知识体系将网站划分为太阳系行星、恒星与星系、黑洞科普、四季星座、星空图集等八大栏目，采用卡片式布局清晰展示各类知识点；在互动设计上，设置了知识测验、探索工具等板块，并辅以行星公转动画、动态星空背景等视觉效果，使网站在保证科普性的同时兼具趣味性与观赏性。')
heading2('3.2  网站栏目设置')
body('网站共设置九大栏目，各栏目的主题、名称及对应网页文件如表3-1所示。')
caption('表3-1  网站栏目表')
tb = doc.add_table(rows=1, cols=3)
tb.style = 'Table Grid'
tb.alignment = WD_TABLE_ALIGNMENT.CENTER
hdr = tb.rows[0].cells
for i, t in enumerate(['主题', '栏目', '网页']):
    hdr[i].text = ''
    r = hdr[i].paragraphs[0].add_run(t)
    r.font.bold = True
    r.font.name = 'Times New Roman'
    r._element.get_or_add_rPr().get_or_add_rFonts().set(qn('w:eastAsia'), '宋体')
    hdr[i].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
cols = [
    ('宇宙探索天文科普', '太阳系行星', 'solar-system.html'),
    ('宇宙探索天文科普', '恒星与星系', 'stars-galaxies.html'),
    ('宇宙探索天文科普', '黑洞科普', 'black-hole.html'),
    ('宇宙探索天文科普', '四季星座', 'constellations.html'),
    ('宇宙探索天文科普', '星空图集', 'gallery.html'),
    ('宇宙探索天文科普', '知识测验', 'quiz.html'),
    ('宇宙探索天文科普', '探索工具', 'explore.html'),
    ('宇宙探索天文科普', '深空天体', 'deep-space.html'),
    ('宇宙探索天文科普', '资料下载', 'download.html'),
]
for a, b, c in cols:
    row = tb.add_row().cells
    for i, t in enumerate([a, b, c]):
        row[i].text = ''
        r = row[i].paragraphs[0].add_run(t)
        r.font.size = Pt(10.5)
        r.font.name = 'Times New Roman'
        r._element.get_or_add_rPr().get_or_add_rFonts().set(qn('w:eastAsia'), '宋体')
        row[i].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER

# ===================== 第四章 =====================
heading1('第四章  网站页面效果展示')
heading2('4.1  首页效果图介绍')
body('首页是网站的入口页面，文件名为 index.html。首页顶部为固定导航栏，包含网站标识与各栏目链接；主体区域以“探索宇宙的奥秘”主题横幅开篇，并配有动态星空背景与漂浮的星球元素；其下依次为“天文知识分类学习”卡片区，通过八个卡片引导用户进入各栏目；随后是“今日天文图片”“宇宙编年史”“天文冷知识”“知识挑战”与“天文资讯”等板块，末部为页脚信息。首页整体层次分明、信息丰富，网站首页效果如图4-1所示。')
figure(os.path.join(SHOTS, 'home.png'))
caption('图4-1  首页效果图')

heading2('4.2  分类目效果图介绍')
heading3('4.2.1  太阳系行星栏目')
body('太阳系行星栏目（solar-system.html）以动态的行星公转轨道动画直观展示八大行星围绕太阳运行的场景，页面中部提供八颗行星的信息卡片，卡片中列出了行星的直径、距离、公转周期与卫星数量等关键数据，点击卡片可查看该行星的详细介绍。该页面效果如图4-2所示。')
figure(os.path.join(SHOTS, 'solar.png'))
caption('图4-2  太阳系行星页面')

heading3('4.2.2  恒星与星系栏目')
body('恒星与星系栏目（stars-galaxies.html）系统介绍恒星的一生与星系分类。页面分为“恒星的一生”与“星系类型”两个部分，分别以卡片形式展示蓝巨星、红巨星、黄矮星、白矮星、中子星、脉冲星等恒星类型，以及旋涡星系、椭圆星系、棒旋星系、不规则星系等星系类型。页面效果如图4-3所示。')
figure(os.path.join(SHOTS, 'stars.png'))
caption('图4-3  恒星与星系页面')

heading3('4.2.3  黑洞科普栏目')
body('黑洞科普栏目（black-hole.html）介绍黑洞的概念、结构与类型。页面以图文结合的方式讲解黑洞的事件视界、奇点等概念，并分类展示恒星级黑洞、中等质量黑洞、超大质量黑洞与原初黑洞，页面底部还列出了有趣的黑洞数据。页面效果如图4-4所示。')
figure(os.path.join(SHOTS, 'blackhole.png'))
caption('图4-4  黑洞科普页面')

heading3('4.2.4  四季星座栏目')
body('四季星座栏目（constellations.html）按春、夏、秋、冬四季展示代表性星座。页面顶部提供季节筛选按钮，点击可筛选对应季节的星座；每个星座以卡片形式展示其星图、名称、拉丁名、最佳观测时间与最亮恒星等信息。页面效果如图4-5所示。')
figure(os.path.join(SHOTS, 'constellations.png'))
caption('图4-5  四季星座页面')

heading3('4.2.5  星空图集栏目')
body('星空图集栏目（gallery.html）精选哈勃、韦伯等望远镜拍摄的精美宇宙照片，支持按“星云”“星系”“行星”“深空”等分类筛选浏览，点击图片可放大查看，页面底部还介绍了哈勃、韦伯、钱德拉三大太空望远镜。页面效果如图4-6所示。')
figure(os.path.join(SHOTS, 'gallery.png'))
caption('图4-6  星空图集页面')

heading3('4.2.6  知识测验栏目')
body('知识测验栏目（quiz.html）提供天文知识问答挑战。用户可选择“太阳系”“恒星与星系”“黑洞”“宇宙探索”等主题，系统随机抽取题目，答题后即时给出对错反馈与答案解析，完成全部题目后显示成绩与错题回顾。页面效果如图4-7所示。')
figure(os.path.join(SHOTS, 'quiz.png'))
caption('图4-7  知识测验页面')

heading3('4.2.7  探索工具栏目')
body('探索工具栏目（explore.html）提供星图查询、光年换算、距离计算等互动小工具，帮助用户直观理解天文尺度与单位换算，将抽象的天文概念转化为可动手操作的体验。页面效果如图4-8所示。')
figure(os.path.join(SHOTS, 'explore.png'))
caption('图4-8  探索工具页面')

# ===================== 第五章 =====================
heading1('第五章  总结与展望')
heading2('5.1  总结')
body('本课题设计并实现了一个以“宇宙探索”为主题的天文科普网站。网站围绕太阳系行星、恒星与星系、黑洞、四季星座、星空图集等天文知识体系，完成了首页及九大栏目的规划与开发，实现了行星公转轨道动画、星座季节筛选、图集分类浏览、知识测验即时评分、动态星空背景等丰富的交互与视觉效果，并针对不同屏幕尺寸做了响应式适配。')
body('通过本次毕业设计，本人系统地经历了网站需求分析、整体规划、界面设计、页面开发与功能测试的完整流程，加深了对 HTML5、CSS3、JavaScript 等前端开发技术的理解与运用，掌握了利用浏览器开发者工具进行调试的方法，也提升了自己分析问题、解决问题的能力，为今后从事相关开发工作积累了宝贵经验。')
heading2('5.2  展望')
body('由于时间与能力所限，网站仍存在一些不足之处，未来可在以下方面进一步完善：一是增加用户系统与数据存储功能，实现注册登录、成绩排行、留言互动等，使网站从静态展示升级为可交互的完整平台；二是引入后端技术与数据库，实现内容的动态管理与更新，降低维护成本；三是丰富科普内容与可视化形式，例如引入 3D 星图、沉浸式星际漫游等更直观的展示手段；四是进一步优化移动端体验，开发响应式页面或小程序版本，满足更多用户的访问需求。')

doc.save(OUT)
print('已生成:', OUT)
print('段落数:', len(doc.paragraphs), '表格数:', len(doc.tables))
