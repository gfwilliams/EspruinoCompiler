ENTRY(entryPoint)

MEMORY
{
  RAM (xrw)       : ORIGIN = 0, LENGTH = 100K
}

SECTIONS
{
  .entrypoint :
  {
    . = ALIGN(4);
    *(.entryPoint)
  }
  /* We put everything in .text section as we load everything into RAM as one binary string */

  .text :
  {
    . = ALIGN(4);
    *(.text)
    *(.text*)
    *(.rodata)
    *(.rodata*)
    . = ALIGN(4);
    *(.data)           /* .data sections */
    *(.data*)          /* .data* sections */
    . = ALIGN(4);
    *(.bss)
    *(.bss*)
    *(COMMON)
    . = ALIGN(4);
  } >RAM

  /* Remove stuff we don't want */
  /DISCARD/ :
  {
    libc.a ( * )
    libm.a ( * )
    libgcc.a ( * )
    *(.ARM.*)
    *(.comment)
  }
}
