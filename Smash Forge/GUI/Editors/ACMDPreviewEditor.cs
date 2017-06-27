﻿using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;
using WeifenLuo.WinFormsUI.Docking;
using SALT.Scripting.AnimCMD;
using System.Text.RegularExpressions;

namespace Smash_Forge
{
    public partial class ACMDPreviewEditor : DockContent
    {
        public uint crc;
        public bool set = false;

        public ACMDPreviewEditor()
        {
            InitializeComponent();
        }

        public void SetAnimation(uint crc)
        {
            bool changed = false;
            if (cb_section.Text.Equals("GAME") && Runtime.Moveset.Game.Scripts.ContainsKey(crc))
            {
                richTextBox1.Text = ACMDDecompiler.Decompile((ACMDScript)Runtime.Moveset.Game.Scripts[crc]);
                changed = true;
            }
            if (cb_section.Text.Equals("SOUND") && Runtime.Moveset.Sound.Scripts.ContainsKey(crc))
            {
                richTextBox1.Text = ACMDDecompiler.Decompile((ACMDScript)Runtime.Moveset.Sound.Scripts[crc]);
                changed = true;
            }
            if (cb_section.Text.Equals("EXPRESSION") && Runtime.Moveset.Expression.Scripts.ContainsKey(crc))
            {
                richTextBox1.Text = ACMDDecompiler.Decompile((ACMDScript)Runtime.Moveset.Expression.Scripts[crc]);
                changed = true;
            }
            if (cb_section.Text.Equals("EFFECT") && Runtime.Moveset.Effect.Scripts.ContainsKey(crc))
            {
                richTextBox1.Text = ACMDDecompiler.Decompile((ACMDScript)Runtime.Moveset.Effect.Scripts[crc]);
                changed = true;
            }
            if (changed)
            {
                set = true;
                this.crc = crc;
                //HighlightSyntax();
            }
        }

        private void button1_Click(object sender, EventArgs e)
        {
            if(Runtime.Moveset != null && Runtime.Moveset.Game.Scripts.ContainsKey(crc))
            {
                // need to split into lines
                string[] line = richTextBox1.Text.Split('\n');
                ACMDScript script = new ACMDScript(crc);
                int index = 0;
                try
                {
                    foreach (string str in line)
                    {
                        if (str.Equals("")) continue;
                        ACMDCompiler.CompileSingleCommand(str); // try to compile
                        index++;
                    }
                    foreach (ACMDCommand s in ACMDCompiler.CompileCommands(line))
                    {
                        script.Add(s);
                        index++;
                    }

                    Runtime.Moveset.Game.Scripts[crc] = script;
                } catch (Exception)
                {
                    HighlightLine(richTextBox1, index, Color.Red);
                }
            }
        }

        public void HighlightSyntax()
        {
            RichTextBox rtb = richTextBox1;
            rtb.SelectAll();
            rtb.SelectionBackColor = rtb.BackColor;
            rtb.SelectionColor = rtb.ForeColor;
            HighlightRegex(richTextBox1, "\\w+\\(", Color.Blue, 1);
            HighlightRegex(richTextBox1, "\\w+=", Color.Teal, 1);
            HighlightRegex(richTextBox1, "0x\\w+", Color.Green, 0);

            // check parathesis?
        }

        public void HighlightRegex(RichTextBox rtb, string reg, Color c, int ignore)
        {
            Regex regExp = new Regex(reg);
            foreach (Match match in regExp.Matches(rtb.Text))
            {
                rtb.Select(match.Index, match.Length-ignore);
                rtb.SelectionColor = c;
            }
        }

        public void HighlightLine(RichTextBox richTextBox, int index, Color color)
        {
            richTextBox.SelectAll();
            richTextBox.SelectionBackColor = richTextBox.BackColor;
            var lines = richTextBox.Lines;
            if (index < 0 || index >= lines.Length)
                return;
            var start = richTextBox.GetFirstCharIndexFromLine(index);  
            var length = lines[index].Length;
            richTextBox.Select(start, length);                 
            richTextBox.SelectionBackColor = color;
        }

        private void cb_section_TextUpdate(object sender, EventArgs e)
        {
            if(set)
                SetAnimation(crc);
        }

        private void updateSelection(object sender, EventArgs e)
        {
            if(set)
                SetAnimation(crc);
        }

        private void richTextBox1_TextChanged(object sender, EventArgs e)
        {

        }

        private void richTextBox1_KeyPress(object sender, KeyPressEventArgs e)
        {
            //HighlightSyntax();
        }
    }
}
