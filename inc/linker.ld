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
  /* Then code, then constants */

  .text :
  {
    . = ALIGN(4);
    *(.text)
    *(.text*)
    *(.rodata)
    *(.rodata*)
    . = ALIGN(4);
  } >RAM

  .data :
  {
    . = ALIGN(4);
    *(.data)           /* .data sections */
    *(.data*)          /* .data* sections */
  } >RAM

  .bss :
  {
    /* This is used by the startup in order to initialize the .bss secion */
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
